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
	AnyAction,
	ObjectState,
	ISelector,
} from './types'
import { createReducers } from './reducers'
import { createActions } from './actions'
import { createViews, createSelector } from './views'
import validate from './validate'
import {
	emptyObject,
	readonlyDeepClone,
	isComplexObject,
	patchObj,
} from './utils'
import reduxDevTools from './reduxDevtools'

const randomString = () =>
	Math.random().toString(36).substring(7).split('').join('.')

const ActionTypes = {
	INIT: `@@redox/INIT${/* #__PURE__ */ randomString()}`,
	SET: '@@redox/SET',
	MODIFY: '@@redox/MODIFY',
	PATCH: '@@redox/PATCH',
}

type unSubscribe = () => void

type InternalStoreManager = {
	get<IModel extends AnyModel>(model: IModel): Store<IModel>
	_getRedox<IModel extends AnyModel>(model: IModel): RedoxStore<IModel>
	getState(): { [X: string]: State }
	dispatch(action: AnyAction): void
	subscribe(model: AnyModel, fn: () => any): unSubscribe
	destroy(): void
}

export type IStoreManager = Omit<InternalStoreManager, '_getRedox'>

export type pluginHook<IModel extends AnyModel = AnyModel> = {
	onInit?(
		storeManager: IStoreManager,
		initialState: Record<string, State>
	): void
	onModel?(model: IModel): void
	onStoreCreated?(Store: RedoxStoreProxy): void
	onDestroy?(): void
}

const proxyMethods = [
	'name',
	'getState',
	'dispatch',
	'subscribe',
	'onReducer',
] as const

type IProxyMethods = typeof proxyMethods[number]

type RedoxStoreProxy = Pick<RedoxStore<AnyModel>, IProxyMethods>

export type IPlugin<IModel extends AnyModel = AnyModel, Option = any> = (
	option: Option
) => pluginHook<IModel>

type ICacheMap = Map<string, RedoxStore<any>>

export type RedoxOptions = {
	initialState?: Record<string, State>
	plugins?: [IPlugin, any?][]
}

export function internalRedox(
	{
		initialState = emptyObject,
		plugins = [],
	}: RedoxOptions = {} as RedoxOptions
): InternalStoreManager {
	const cacheMap: ICacheMap = new Map()
	let initState = initialState

	const getInitialState = (name: string): State | undefined => {
		const result = initState[name]
		if (result) {
			delete initState[name]
		}
		return result
	}

	if (process.env.NODE_ENV === 'development') {
		plugins.unshift([reduxDevTools])
	}

	const hooks = plugins.map(([plugin, option]) => plugin(option))
	const storeManager = {
		get<IModel extends AnyModel>(model: IModel) {
			const redoxStore = storeManager._getRedox(model)
			return redoxStore.storeApi
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
			const redoxStore = storeManager._getRedox(model)
			return redoxStore.subscribe(fn)
		},
		getState() {
			const allState = {} as ReturnType<InternalStoreManager['getState']>
			for (const [key, store] of cacheMap.entries()) {
				allState[key] = store.$state()
			}
			return allState
		},
		dispatch(action: AnyAction) {
			for (const store of cacheMap.values()) {
				store.dispatch(action)
			}
		},
		destroy() {
			hooks.map((hook) => hook.onDestroy?.())
			for (const store of cacheMap.values()) {
				store.destroy()
			}
			cacheMap.clear()
			initState = emptyObject
		},
	}
	function initModel<M extends AnyModel>(model: M): RedoxStore<M> {
		hooks.map((hook) => hook.onModel?.(model))

		const depends = model._depends
		if (depends) {
			depends.forEach((depend) => {
				storeManager._getRedox(depend) // trigger initial
			})
		}
		const store = new RedoxStore(
			model,
			storeManager,
			getInitialState(model.name)
		)
		const storeProxy = new Proxy(store, {
			get(target, prop: IProxyMethods) {
				if (process.env.NODE_ENV === 'development') {
					validate(() => [
						[
							!proxyMethods.includes(prop),
							`invalidate props ${prop}, should be one of ${proxyMethods.join(
								' | '
							)}`,
						],
					])
				}
				return target[prop]
			},
		})
		hooks.map((hook) => hook.onStoreCreated?.(storeProxy))
		const storeName = model.name
		cacheMap.set(storeName, store)
		return store
	}
	const { _getRedox, ...rest } = storeManager
	hooks.map((hook) => hook.onInit?.({ ...rest }, initState))
	return storeManager
}

export class RedoxStore<IModel extends AnyModel> {
	public _cache: InternalStoreManager
	public name: Readonly<string>
	public model: Readonly<IModel>
	public storeApi: Store<IModel>
	public $state: () => IModel['state']
	public $actions = {} as DispatchOfModel<IModel>
	public $views = {} as RedoxViews<IModel['views']>

	private reducer: ReduxReducer<IModel['state']> | null
	private currentState: IModel['state']
	private listeners: Set<() => void> = new Set()
	private isDispatching: boolean

	constructor(model: IModel, cache: InternalStoreManager, initState: State) {
		this._cache = cache
		this.model = model
		this.name = this.model.name || ''
		this.reducer = createModelReducer(model)
		this.currentState = initState || model.state
		this.isDispatching = false

		if (process.env.NODE_ENV === 'development') {
			let lastState = this.getState()
			let $stateCache = readonlyDeepClone(lastState)
			this.$state = () => {
				if (lastState === this.getState()) {
					return $stateCache
				}
				lastState = this.getState()
				$stateCache = readonlyDeepClone(lastState)
				return $stateCache
			}
		} else {
			this.$state = this.getState
		}

		this.dispatch({ type: ActionTypes.INIT })

		enhanceModel(this)

		const depends = this.model._depends
		// collection beDepends, a depends b, when b update, call a need trigger listener
		if (depends) {
			depends.forEach((depend, index) => {
				this._cache.subscribe(depend, this._triggerListener)
			})
		}

		this.storeApi = getStoreApi(this)
	}

	getState = () => {
		return this.currentState!
	}

	$set = (newState: State) => {
		if (process.env.NODE_ENV === 'development') {
			validate(() => [
				[
					typeof newState === 'bigint' || typeof newState === 'symbol',
					"'BigInt' and 'Symbol' are not assignable to the State",
				],
			])
		}
		return this.dispatch({
			type: ActionTypes.SET,
			payload: newState,
		})
	}

	$patch = (partState: ObjectState) => {
		return this.dispatch({
			type: ActionTypes.PATCH,
			payload: function patch(state: State) {
				if (process.env.NODE_ENV === 'development') {
					validate(() => [
						[
							!isComplexObject(partState),
							`$patch argument should be a object, but receive a ${Object.prototype.toString.call(
								partState
							)}`,
						],
						[
							Array.isArray(state),
							`when call $patch, previous state should not be a array, but receive a ${typeof state}`,
						],
					])
				}
				if (!state) {
					return partState
				}
				patchObj(state as ObjectState, partState)
				return
			},
		})
	}

	$modify = (modifier: (state: State) => void) => {
		return this.dispatch({
			type: ActionTypes.MODIFY,
			payload: function modify(state: State) {
				if (process.env.NODE_ENV === 'development') {
					validate(() => [
						[
							typeof modifier !== 'function',
							'Expected the param to be a Function',
						],
					])
				}
				modifier(state)
			},
		})
	}

	$createSelector = <TReturn>(selector: ISelector<IModel, TReturn>) => {
		const cacheSelectorFn = createSelector(selector)
		const res = () => {
			const stateAnViews = {} as Record<string, any>
			Object.assign(stateAnViews, this.getState(), this.$views)
			Object.defineProperty(stateAnViews, '$state', {
				enumerable: true,
				configurable: true,
				get: () => {
					return this.getState()
				},
			})
			return cacheSelectorFn(stateAnViews) as TReturn
		}
		res.clearCache = cacheSelectorFn.clearCache
		return res
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

	onReducer: (fn: (reducer: ReduxReducer) => ReduxReducer | undefined) => void =
		(fn) => {
			this.reducer = fn(this.reducer!) || this.reducer
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
			nextState = this.reducer!(this.currentState, action)
		} finally {
			this.isDispatching = false
		}

		if (nextState !== this.currentState) {
			this.currentState = nextState
			// trigger self listeners
			this._triggerListener()
		}

		return action
	}

	_triggerListener = () => {
		for (const listener of this.listeners) {
			listener()
		}
	}

	destroy = () => {
		// @ts-ignore
		this.currentState = null
		this.reducer = null
		this.listeners.clear()
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
	store.$set = redoxStore.$set
	store.$patch = redoxStore.$patch
	store.$modify = redoxStore.$modify
	store.$actions = redoxStore.$actions
	store.$createSelector = redoxStore.$createSelector
	Object.assign(store, redoxStore.$actions, redoxStore.$views)
	Object.defineProperty(store, '$state', {
		enumerable: true,
		configurable: false,
		get() {
			return redoxStore.$state()
		},
		set() {
			console.warn(`not allow set property '$state'`)
			return false
		},
	})
	return store
}

function enhanceModel<IModel extends AnyModel>(
	redoxStore: RedoxStore<IModel>
): void {
	if (redoxStore.model.reducers) createReducers(redoxStore)
	if (redoxStore.model.actions) createActions(redoxStore)
	if (redoxStore.model.views) createViews(redoxStore)
}

setAutoFreeze(false)

export function createModelReducer<
	N extends string,
	S extends State,
	MC extends ModelCollection,
	R extends Reducers<S>,
	RA extends RedoxActions,
	V extends Views
>(model: Model<N, S, MC, R, RA, V>): ReduxReducer<S, Action> {
	// select and run a reducer based on the incoming action
	return (state: S = model.state, action: Action): S => {
		if (action.type === ActionTypes.SET) {
			return action.payload
		}

		let reducer = model.reducers?.[action.type]

		if (
			action.type === ActionTypes.MODIFY ||
			action.type === ActionTypes.PATCH
		) {
			reducer = action.payload
		}

		if (typeof reducer === 'function') {
			// immer does not support 'undefined' state
			if (state === undefined) return reducer(state, action.payload) as S
			return produce(
				state,
				(draft: any) => reducer!(draft, action.payload) as S
			)
		}

		return state
	}
}
