import {
  State,
  ModelInstance,
  Actions,
  Views,
  Action,
  Selector,
} from './modelOptions'
import { AnyModel } from './defineModel'
import {
  RedoxCacheValue,
  RedoxStoreCache,
  Plugin,
  RedoxStore,
  ProxyMethods,
  proxyMethods,
  Dispatch,
} from './types'
import { createReducers } from './reducers'
import { createActions } from './actions'
import { createViews, createSelector } from './views'
import { Model } from './model'
import getPublicApi from './getPublicApi'
import { emptyObject, readonlyDeepClone } from '../utils'

export * from './modelOptions'
export * from './defineModel'

export { Dispatch }

export type RedoxOptions = {
  initialState?: Record<string, any>
  plugins?: [Plugin, any?][]
}

export function redox(
  {
    initialState = emptyObject,
    plugins = [],
  }: RedoxOptions = {} as RedoxOptions
) {
  const cacheMap: RedoxStoreCache = new Map()
  let initState = initialState

  const getInitialState = (name: string): State | undefined => {
    const result = initState[name]
    if (result) {
      delete initState[name]
    }
    return result
  }

  const hooks = plugins.map(([plugin, option]) => plugin(option))
  const redoxStore = {
    getModel<IModel extends AnyModel>(model: IModel) {
      let cacheStore = getCacheValue(model)
      return cacheStore.publicApi
    },
    getState() {
      const allState = {} as ReturnType<RedoxStore['getState']>
      for (const [key, { internalModelInstance }] of cacheMap.entries()) {
        allState[key] = internalModelInstance.getState()
      }
      return allState
    },
    dispatch(action: Action) {
      for (const { internalModelInstance } of cacheMap.values()) {
        internalModelInstance.dispatch(action)
      }
    },
    subscribe(model: AnyModel, fn: () => any) {
      const { internalModelInstance } = getCacheValue(model)
      return internalModelInstance.subscribe(fn)
    },
    destroy() {
      hooks.map((hook) => hook.onDestroy?.())
      for (const { internalModelInstance } of cacheMap.values()) {
        internalModelInstance.destroy()
      }
      cacheMap.clear()
      initState = emptyObject
    },
  } as RedoxStore

  function getCacheValue<M extends AnyModel>(model: M) {
    const name = model.name
    let cacheStore = cacheMap.get(name)
    if (cacheStore) {
      return cacheStore
    }
    return initModel(model)
  }

  function initModel<M extends AnyModel>(model: M): RedoxCacheValue {
    hooks.map((hook) => hook.onModel?.(model))

    const internalModelInstance = new Model(model, getInitialState(model.name))

    const depends = model._depends
    if (depends) {
      depends.forEach((depend) => {
        // trigger depends initial
        const depends = getCacheValue(depend)
        // collection beDepends, a depends b, when b update, call a need trigger listener
        depends.internalModelInstance.subscribe(
          internalModelInstance.triggerListener
        )
      })
    }

    const internalModelInstanceProxy = new Proxy(internalModelInstance, {
      get(target, prop: ProxyMethods) {
        if (proxyMethods.includes(prop)) {
          return target[prop]
        }

        return undefined
      },
    })
    hooks.map((hook) => {
      hook.onModelInstanced?.(internalModelInstanceProxy)
    })

    let $state: Model<M>['getState']
    // $state function
    if (process.env.NODE_ENV === 'development') {
      let lastState = internalModelInstance.getState()
      let $stateCache = readonlyDeepClone(lastState)
      $state = function () {
        if (lastState === internalModelInstance.getState()) {
          return $stateCache
        }
        lastState = internalModelInstance.getState()
        $stateCache = readonlyDeepClone(lastState)
        return $stateCache
      } as Model<M>['getState']
    } else {
      $state = internalModelInstance.getState
    }

    const $views = {} as Views<M['views']>
    createViews($views, internalModelInstance, getCacheValue)

    const $createSelector = <TReturn>(selector: Selector<M, TReturn>) => {
      return createSelector(internalModelInstance, getCacheValue, selector)
    }

    const $actions = {} as Actions<M>
    createReducers($actions, internalModelInstance)
    createActions($actions, internalModelInstance, getCacheValue)

    const publicApi: ModelInstance<M> = getPublicApi(
      internalModelInstance,
      $state,
      $actions,
      $views,
      $createSelector
    )

    const modelName = model.name
    const redoxCacheValue = {
      internalModelInstance,
      publicApi,
    }
    cacheMap.set(modelName, redoxCacheValue)
    return redoxCacheValue
  }
  hooks.map((hook) => hook.onInit?.(redoxStore, initState))
  return redoxStore
}
