import produce, { setAutoFreeze } from 'immer'
import {
	Action,
	State,
	ModelCollection,
	ReduxReducer,
	ReduxDispatch,
	Reducers,
	RedoxActions,
	Views,
	Store,
	Model,
	DispatchOfModel,
	RedoxViews,
	AnyModel,
} from './types'
import { createReducers } from './reducers'
import { createActions } from './actions'
import { createViews } from './views'
import validate from './validate'
import { emptyObject } from './utils'

const randomString = () =>
	Math.random().toString(36).substring(7).split('').join('.')

const ActionTypes = {
	INIT: `@@redox/INIT${/* #__PURE__ */ randomString()}`,
	SET: '@@redox/SET',
	MODIFY: '@@redox/MODIFY',
}

type unSubscribe = () => void

export type IModelManager = {
	get<IModel extends AnyModel>(model: IModel): Store<IModel>
	_getRedox<IModel extends AnyModel>(model: IModel): RedoxStore<IModel>
	subscribe(model: AnyModel, fn: () => any): unSubscribe
	_getInitialState: (name: string) => State | undefined
	getSnapshot(): { [X: string]: State }
	destroy(): void
}

type ICacheMap = Map<string, RedoxStore<any>>

export function redox(initialState?: Record<string, State>): IModelManager {
	const cacheMap: ICacheMap = new Map()
	let initState = initialState || emptyObject
	const modelCache = {
		get<IModel extends AnyModel>(model: IModel) {
			const redoxStore = modelCache._getRedox(model)
			return redoxStore.storeApi
		},
		_getInitialState: (name: string): State | undefined => {
			const result = initState[name]
			delete initState[name]
			return result
		},
		_getRedox<IModel extends AnyModel>(model: IModel) {
			const name = model.name
			let cacheStore = cacheMap.get(name)
			if (cacheStore) {
				return cacheStore as RedoxStore<IModel>
			}
			return initModel(model)
		},
		subscribe(model: AnyModel, fn: () => any) {
			const redoxStore = modelCache._getRedox(model)
			return redoxStore.subscribe(fn)
		},
		// only get change state
		getSnapshot() {
			const allState = {} as ReturnType<IModelManager['getSnapshot']>
			for (const [key, store] of cacheMap.entries()) {
				allState[key] = store.$state()
			}
			return allState
		},
		destroy() {
			for (const store of cacheMap.values()) {
				store.destroy()
			}
			cacheMap.clear()
			initState = emptyObject
		},
	}
	function initModel<M extends AnyModel>(model: M): RedoxStore<M> {
		const depends = model._depends
		if (depends) {
			depends.forEach((depend) => {
				modelCache._getRedox(depend) // trigger initial
			})
		}
		const store = new RedoxStore(model, modelCache)
		const storeName = model.name
		cacheMap.set(storeName, store)
		return store
	}
	return modelCache
}

export class RedoxStore<IModel extends AnyModel> {
	public _beDepends: Set<RedoxStore<any>> = new Set()
	public _cache: IModelManager
	public model: Readonly<IModel>
	public storeApi: Store<IModel>
	public storeDepends: Record<string, Store<AnyModel>>
	public $actions = {} as DispatchOfModel<IModel>
	public $views = {} as RedoxViews<IModel['views']>

	private currentState: IModel['state']
	private currentReducer: ReduxReducer<IModel['state']> | null
	private listeners: Set<() => void> = new Set()
	private isDispatching: boolean

	constructor(model: IModel, cache: IModelManager) {
		this._cache = cache
		this.model = model
		this.storeDepends = {}
		enhanceReducer(model)
		const reducer = createModelReducer(model)
		this.currentReducer = reducer
		this.currentState =
			(this.model.name && this._cache._getInitialState(this.model.name)) ||
			model.state
		this.isDispatching = false
		this.dispatch({ type: ActionTypes.INIT })

		enhanceModel(this)

		this.storeApi = getStoreApi(this)

		const depends = this.model._depends
		// collection _beDepends, a depends b, when b update, call a need update
		if (depends) {
			depends.forEach((depend) => {
				const dependStore = this._cache._getRedox(depend)
				this.addBeDepends(dependStore)
				this.storeDepends[depend.name] = dependStore.storeApi
			})
		}
	}

	$state = () => {
		return this.currentState!
	}

	$set = (newState: State) => {
		this.dispatch({
			type: ActionTypes.SET,
			payload: newState,
		})
	}

	$modify = (modifier: (state: State) => void) => {
		this.dispatch({
			type: ActionTypes.MODIFY,
			payload: modifier,
		})
	}

	subscribe = (listener: () => void) => {
		if (process.env.NODE_ENV === 'development') {
			validate(() => [
				[
					typeof listener !== 'function',
					`Expected the listener to be a function`,
				],
				[
					this.isDispatching,
					'You may not call store.subscribe() while the reducer is executing.',
				],
			])
		}

		this.listeners.add(listener)

		return () => {
			if (process.env.NODE_ENV === 'development') {
				validate(() => [
					[
						this.isDispatching,
						'You may not unsubscribe from a store listener while the reducer is executing. ',
					],
				])
			}

			this.listeners.delete(listener)
		}
	}

	dispatch: ReduxDispatch = (action) => {
		if (process.env.NODE_ENV === 'development') {
			validate(() => [
				[
					typeof action.type === 'undefined',
					'Actions may not have an undefined "type" property. You may have misspelled an action type string constant.',
				],
				[this.isDispatching, 'Reducers may not dispatch actions.'],
			])
		}

		let nextState

		try {
			this.isDispatching = true
			nextState = this.currentReducer!(this.currentState, action)
		} finally {
			this.isDispatching = false
		}

		if (nextState !== this.currentState) {
			this.currentState = nextState
			// trigger self listeners
			this._triggerListener()
			// trigger beDepends listeners
			for (const beDepend of this._beDepends) {
				beDepend._triggerListener()
			}
		}

		return action
	}

	private addBeDepends = (dependStore: RedoxStore<any>) => {
		dependStore._beDepends.add(this)
	}

	_triggerListener = () => {
		for (const listener of this.listeners) {
			listener()
		}
	}

	destroy = () => {
		// @ts-ignore
		this.currentState = null
		this.currentReducer = null
		this.listeners.clear()
		this._beDepends.clear()
		this.model = emptyObject
		this._cache = emptyObject
		if (this.$views) {
			const viewsKeys = Object.keys(this.$views)
			for (const viewsKey of viewsKeys) {
				// @ts-ignore
				this.$views[viewsKey] = null
			}
			this.$views = emptyObject
		}
	}
}

function getStoreApi<M extends AnyModel = AnyModel>(
	redoxStore: RedoxStore<M>
): Store<M> {
	const store = {} as Store<M>
	store.$state = redoxStore.$state
	store.$set = redoxStore.$set
	store.$modify = redoxStore.$modify
	Object.assign(store, redoxStore.$actions, redoxStore.$views)
	return store
}

function enhanceModel<IModel extends AnyModel>(
	redoxStore: RedoxStore<IModel>
): void {
	createReducers(redoxStore)
	if (redoxStore.model.actions) createActions(redoxStore)
	if (redoxStore.model.views) createViews(redoxStore)
}

function enhanceReducer<
	N extends string,
	S extends State,
	MC extends ModelCollection,
	R extends Reducers<S>,
	RA extends RedoxActions,
	V extends Views
>(model: Model<N, S, MC, R, RA, V>) {
	model.reducers = {
		...(model.reducers ? model.reducers : {}),
		[ActionTypes.SET]: function (_, payload: S) {
			return payload
		},
		[ActionTypes.MODIFY]: function (state: S, payload: (s: S) => {}) {
			payload(state)
			return state
		},
	} as R
}

setAutoFreeze(false)
function wrapReducerWithImmer(reducer: ReduxReducer) {
	return (state: any, payload: any): any => {
		if (state === undefined) return reducer(state, payload)
		return produce(state, (draft: any) => reducer(draft, payload))
	}
}

export function createModelReducer<
	N extends string,
	S extends State,
	MC extends ModelCollection,
	R extends Reducers<S>,
	RA extends RedoxActions,
	V extends Views
>(model: Model<N, S, MC, R, RA, V>): ReduxReducer<S, Action> {
	// select and run a reducer based on the incoming action
	const reducer = (state: S = model.state, action: Action): S => {
		const reducer = model.reducers![action.type]
		if (typeof reducer === 'function') {
			return reducer(state, action.payload) as S
		}

		return state
	}

	return wrapReducerWithImmer(reducer)
}
