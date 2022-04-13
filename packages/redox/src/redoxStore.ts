import produce, { setAutoFreeze } from 'immer'
import {
	Action,
	State,
	ModelCollection,
	ReduxReducer,
	AnyAction,
	ReduxDispatch,
	Reducers,
	Effects,
	Effect,
	Views,
	Store,
	Model,
	AnyModel,
} from './types'
import { createEffectDispatcher, createReducerDispatcher } from './dispatcher'
import { createViews } from './views'
import validate from './validate'
import { getDependsState, getDependsDispatch, emptyObject } from './utils'

const randomString = () =>
	Math.random().toString(36).substring(7).split('').join('.')

const ActionTypes = {
	INIT: `@@redux/INIT${/* #__PURE__ */ randomString()}`,
}

export type IModelManager = {
	get<IModel extends AnyModel>(model: IModel): RedoxStore<IModel>
	initialState: Record<string, State>
	getChangedState(): { [X: string]: State }
	destroy(): void
}

type ICacheMap = Map<string, RedoxStore<any>>

export function redox(
	initialState?: IModelManager['initialState']
): IModelManager {
	const cacheMap: ICacheMap = new Map()
	const modelCache = {
		initialState: initialState || emptyObject,
		get<T extends AnyModel>(model: T) {
			const name = model.name
			let cacheStore = cacheMap.get(name)
			if (cacheStore) {
				return cacheStore as RedoxStore<T>
			}
			return initModel(model)
		},
		// only get change state
		getChangedState() {
			const allState = {} as ReturnType<IModelManager['getChangedState']>
			for (const [key, store] of cacheMap.entries()) {
				const initialState = store.model.state
				const getStateRes = store.getState()
				if (initialState !== getStateRes) {
					allState[key] = getStateRes
				}
			}
			return allState
		},
		destroy() {
			for (const store of cacheMap.values()) {
				store.destroy()
			}
			cacheMap.clear()
		},
	}
	function initModel<M extends AnyModel>(model: M): RedoxStore<M> {
		const depends = model._depends
		if (depends) {
			depends.forEach((depend) => {
				modelCache.get(depend) // trigger initial
			})
		}
		const store = new RedoxStore(model, modelCache)
		const storeName = model.name
		cacheMap.set(storeName, store)
		return store
	}
	return modelCache
}

export class RedoxStore<IModel extends AnyModel> implements Store<IModel> {
	public name: string
	public views!: Store<IModel>['views']

	public _beDepends: Store<IModel>['_beDepends'] = new Set()

	public _cache: IModelManager

	public model: Readonly<IModel>

	private currentState: IModel['state'] | null
	private currentReducer: ReduxReducer<IModel['state']> | null
	private listeners: Set<() => void> = new Set()
	private isDispatching: boolean

	constructor(model: IModel, cache: IModelManager) {
		this.name = model.name
		this._cache = cache
		this.model = model
		const depends = this.model._depends
		// collection _beDepends, a depends b, when b update, call a need update
		if (depends) {
			depends.forEach((depend) => {
				const dependStore = this._cache.get(depend)
				this.addBeDepends(dependStore)
			})
		}
		const reducer = createModelReducer(model)
		this.currentReducer = reducer
		let initialState = model.state
		if (this._cache.initialState[this.name]) {
			initialState = this._cache.initialState[this.name]
			delete this._cache.initialState[this.name]
		}
		this.currentState = initialState
		this.isDispatching = false
		this.dispatch({ type: ActionTypes.INIT })

		enhanceModel(this, model)
	}

	getState = () => {
		return this.currentState!
	}

	subscribe(listener: () => void) {
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

		this.listeners.add(listener)

		return () => {
			validate(() => [
				[
					this.isDispatching,
					'You may not unsubscribe from a store listener while the reducer is executing. ',
				],
			])

			this.listeners.delete(listener)
		}
	}

	// applyMiddleware middleware for handling effects
	dispatch = ((action: AnyAction) => {
		if (this.model.effects && this.model.effects.hasOwnProperty(action.type)) {
			// first run reducer action if exists
			this.reduxDispatch(action)
			// then run the effect and return its result
			const effect = this.model.effects[action.type] as Effect<any, any, any>
			const getState = () => {
				return getDependsState(this.model._depends, this._cache)
			}
			const dependsDispatch = getDependsDispatch(
				this.model._depends,
				this._cache
			)

			return effect.call(
				this.dispatch,
				action.payload,
				this.getState(), // selfState
				{
					getState,
					dispatch: dependsDispatch,
				} // collects depends
			)
		}

		return this.reduxDispatch(action)
	}) as unknown as Store<IModel>['dispatch']

	private reduxDispatch: ReduxDispatch = (action) => {
		if (typeof action.type === 'undefined') {
			throw new Error(
				'Actions may not have an undefined "type" property. You may have misspelled an action type string constant.'
			)
		}

		if (this.isDispatching) {
			throw new Error('Reducers may not dispatch actions.')
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
		this.currentState = null
		this.currentReducer = null
		this.listeners.clear()
		this._beDepends.clear()
		this.model = emptyObject
		this._cache = emptyObject
		if (this.views) {
			const viewsKeys = Object.keys(this.views)
			for (const viewsKey of viewsKeys) {
				// @ts-ignore
				this.views[viewsKey] = null
			}
			this.views = emptyObject
		}
	}
}

function enhanceModel<IModel extends AnyModel>(
	store: RedoxStore<IModel>,
	model: IModel
): void {
	createReducerDispatcher(store, model)
	createEffectDispatcher(store, model)
	if (model.views) createViews(store, model)
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
	E extends Effects<S, R, MC>,
	V extends Views<S, MC>
>(model: Model<N, S, MC, R, E, V>): ReduxReducer<S, Action> {
	// select and run a reducer based on the incoming action
	const reducer = (state: S = model.state, action: Action): S => {
		const reducer = model.reducers[action.type]
		if (typeof reducer === 'function') {
			return reducer(state, action.payload) as S
		}

		return state
	}

	return wrapReducerWithImmer(reducer)
}
