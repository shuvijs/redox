import {
  State,
  storeApi,
  DispatchOfModel,
  RedoxViews,
  AnyModel,
  AnyAction,
  ISelector,
} from '../types'
import {
  StoreAndApi,
  IPlugin,
  IStoreManager,
  IProxyMethods,
  proxyMethods,
} from './types'
import { createReducers } from './reducers'
import { createActions } from './actions'
import { createViews, createSelector } from './views'
import devTools from './devtools'
import { RedoxStore } from '../redoxStore'
import getStoreApi from './getStoreApi'
import validate from '../validate'
import { emptyObject, readonlyDeepClone } from '../utils'

export type RedoxOptions = {
  initialState?: Record<string, any>
  plugins?: [IPlugin, any?][]
}

type ICacheMap = Map<string, StoreAndApi>

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
    plugins.unshift([devTools])
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

    const storeApi: storeApi<M> = getStoreApi(
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
