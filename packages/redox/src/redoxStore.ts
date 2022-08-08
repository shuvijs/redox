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

export type IStoreManager = {
  get<IModel extends AnyModel>(model: IModel): Store<IModel>
  getState(): Record<string, State>
  dispatch(action: AnyAction): void
  subscribe(model: AnyModel, fn: () => any): unSubscribe
  destroy(): void
}

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
  'reducer',
] as const

type IProxyMethods = typeof proxyMethods[number]

type RedoxStoreProxy = Pick<RedoxStore<AnyModel>, IProxyMethods>

export type IPlugin<IModel extends AnyModel = AnyModel, Option = any> = (
  option: Option
) => pluginHook<IModel>

export type StoreAndApi = {
  store: RedoxStore<AnyModel>
  storeApi: ReturnType<typeof getStoreApi>
}
type ICacheMap = Map<string, StoreAndApi>

export type RedoxOptions = {
  initialState?: Record<string, any>
  plugins?: [IPlugin, any?][]
}

export function redox(
  {
    initialState = emptyObject,
    plugins = [],
  }: RedoxOptions = {} as RedoxOptions
) {
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
      let cacheStore = getRedox(model)
      return cacheStore.storeApi
    },
    getState() {
      const allState = {} as ReturnType<IStoreManager['getState']>
      for (const [key, { store }] of cacheMap.entries()) {
        allState[key] = store.getState()
      }
      return allState
    },
    dispatch(action: AnyAction) {
      for (const cache of cacheMap.values()) {
        cache.store.dispatch(action)
      }
    },
    subscribe(model: AnyModel, fn: () => any) {
      const redoxStore = getRedox(model)
      return redoxStore.store.subscribe(fn)
    },
    destroy() {
      hooks.map((hook) => hook.onDestroy?.())
      for (const cache of cacheMap.values()) {
        cache.store.destroy()
      }
      cacheMap.clear()
      initState = emptyObject
    },
  } as IStoreManager

  function getRedox<M extends AnyModel>(model: M) {
    const name = model.name
    let cacheStore = cacheMap.get(name)
    if (cacheStore) {
      return cacheStore
    }
    return initModel(model)
  }

  function initModel<M extends AnyModel>(model: M): StoreAndApi {
    hooks.map((hook) => hook.onModel?.(model))

    const store = new RedoxStore(model, getInitialState(model.name))

    const depends = model._depends
    if (depends) {
      depends.forEach((depend) => {
        // trigger depends initial
        const dependStore = getRedox(depend)
        // collection beDepends, a depends b, when b update, call a need trigger listener
        dependStore.store.subscribe(store.triggerListener)
      })
    }

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
    hooks.map((hook) => {
      hook.onStoreCreated?.(storeProxy)
    })

    let $state: RedoxStore<M>['getState']
    // $state function
    if (process.env.NODE_ENV === 'development') {
      let lastState = store.getState()
      let $stateCache = readonlyDeepClone(lastState)
      $state = function () {
        if (lastState === store.getState()) {
          return $stateCache
        }
        lastState = store.getState()
        $stateCache = readonlyDeepClone(lastState)
        return $stateCache
      } as RedoxStore<M>['getState']
    } else {
      $state = store.getState
    }

    const $views = {} as RedoxViews<M['views']>
    createViews($views, store, getRedox)

    const $createSelector = <TReturn>(selector: ISelector<M, TReturn>) => {
      const cacheSelectorFn = createSelector(selector)
      const res = () => {
        const stateAndViews = {} as Record<string, any>
        Object.assign(stateAndViews, store.getState(), $views)
        stateAndViews['$state'] = store.getState()
        return cacheSelectorFn(stateAndViews) as TReturn
      }
      res.clearCache = cacheSelectorFn.clearCache
      return res
    }

    const $actions = {} as DispatchOfModel<M>
    createReducers($actions, store)
    createActions($actions, store, getRedox)

    const storeApi: Store<M> = getStoreApi(
      store,
      $state,
      $actions,
      $views,
      $createSelector
    )

    const storeName = model.name
    const storeAndApi = {
      store,
      storeApi,
    }
    cacheMap.set(storeName, storeAndApi)
    return storeAndApi
  }
  hooks.map((hook) => hook.onInit?.(storeManager, initState))
  return storeManager
}

export class RedoxStore<IModel extends AnyModel> {
  public name: Readonly<string>
  public model: Readonly<IModel>
  public $actions = {} as DispatchOfModel<IModel>
  public $views = {} as RedoxViews<IModel['views']>
  public reducer: ReduxReducer<IModel['state']> | null

  private currentState: IModel['state']
  private listeners: Set<() => void> = new Set()
  private isDispatching: boolean

  constructor(model: IModel, initState: State) {
    this.model = model
    this.name = this.model.name || ''
    this.reducer = createModelReducer(model)
    this.currentState = initState || model.state
    this.isDispatching = false
    this.dispatch({ type: ActionTypes.INIT })
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
      nextState = this.reducer!(this.currentState, action)
    } finally {
      this.isDispatching = false
    }

    if (nextState !== this.currentState) {
      this.currentState = nextState
      // trigger self listeners
      this.triggerListener()
    }

    return action
  }

  triggerListener = () => {
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
  redoxStore: RedoxStore<M>,
  $state: () => M['state'],
  $actions: DispatchOfModel<M>,
  $views: RedoxViews<M['views']>,
  $createSelector: <TReturn>(
    selector: ISelector<M, TReturn>
  ) => (() => TReturn) & { clearCache: () => void }
): Store<M> {
  const store = {} as Store<M>
  store.$set = redoxStore.$set
  store.$patch = redoxStore.$patch
  store.$modify = redoxStore.$modify
  store.$actions = $actions
  store.$views = $views
  store.$createSelector = $createSelector
  Object.assign(store, $actions)
  Object.defineProperty(store, '$state', {
    enumerable: true,
    configurable: false,
    get() {
      return $state()
    },
    set() {
      if (process.env.NODE_ENV === 'development') {
        validate(() => [[true, `not allow set property '$state'`]])
      }
      return false
    },
  })
  const views = $views
  Object.keys(views).forEach((viewKey) => {
    Object.defineProperty(store, viewKey, {
      enumerable: true,
      get() {
        return views[viewKey].call()
      },
      set() {
        if (process.env.NODE_ENV === 'development') {
          validate(() => [
            [true, `not allow change view property '${viewKey}'`],
          ])
        }
        return false
      },
    })
  })
  return store
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
