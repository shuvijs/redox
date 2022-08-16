import {
  State,
  ModelInstance,
  Actions,
  Views,
  Action,
  Selector,
} from './modelOptions'
import { AnyModel } from './defineModel'
import { createReducers } from './modelReducers'
import { createActions } from './modelActions'
import { createViews, createSelector } from './modelViews'
import { Model } from './model'
import getPublicApi from './getPublicApi'
import { emptyObject, readonlyDeepClone } from '../utils'

export type RedoxOptions = {
  initialState?: Record<string, any>
  plugins?: [Plugin, any?][]
}

export type UnSubscribe = () => void

export const proxyMethods = [
  'name',
  'getState',
  'dispatch',
  'subscribe',
  'reducer',
] as const

export type ProxyMethods = typeof proxyMethods[number]

type InternalModelProxy = Pick<Model<AnyModel>, ProxyMethods>

export interface RedoxStore {
  getModel<IModel extends AnyModel>(model: IModel): ModelInstance<IModel>
  getState(): Record<string, State>
  dispatch(action: Action): void
  subscribe(model: AnyModel, fn: () => any): UnSubscribe
  destroy(): void
}

export type PluginHook<IModel extends AnyModel = AnyModel> = {
  onInit?(redoxStore: RedoxStore, initialState: Record<string, State>): void
  onModel?(model: IModel): void
  onModelInstanced?(instance: InternalModelProxy): void
  onDestroy?(): void
}

export type Plugin<IModel extends AnyModel = AnyModel, Option = any> = (
  option: Option
) => PluginHook<IModel>

export type RedoxModel = {
  internalModelInstance: Model<AnyModel>
  publicApi: ModelInstance<AnyModel>
}

class RedoxImpl implements RedoxStore {
  private _initialState: Record<string, State>
  private _hooks: PluginHook[]
  private _models = new Map<any, RedoxModel>()

  constructor(initialState = emptyObject, plugins: [Plugin, any?][] = []) {
    this._initialState = initialState
    this._hooks = plugins.map(([plugin, option]) => plugin(option))
    this._hooks.map((hook) => hook.onInit?.(this, initialState))
  }

  getModel<IModel extends AnyModel>(model: IModel) {
    let instance = this._getModelInstance(model)
    return instance.publicApi as ModelInstance<IModel>
  }

  getState() {
    const allState = {} as ReturnType<RedoxStore['getState']>
    for (const [key, { internalModelInstance }] of this._models.entries()) {
      allState[key] = internalModelInstance.getState()
    }
    return allState
  }

  dispatch(action: Action) {
    for (const { internalModelInstance } of this._models.values()) {
      internalModelInstance.dispatch(action)
    }
  }

  subscribe(model: AnyModel, fn: () => any) {
    const { internalModelInstance } = this._getModelInstance(model)
    return internalModelInstance.subscribe(fn)
  }

  destroy() {
    this._hooks.map((hook) => hook.onDestroy?.())
    for (const { internalModelInstance } of this._models.values()) {
      internalModelInstance.destroy()
    }
    this._models.clear()
    this._initialState = emptyObject
  }

  private _getModelInstance(model: AnyModel) {
    const name = model.name
    let cacheStore = this._models.get(name)
    if (cacheStore) {
      return cacheStore
    }

    return this._initModel(model)
  }

  private _initModel(model: AnyModel): RedoxModel {
    this._hooks.map((hook) => hook.onModel?.(model))

    const internalModelInstance = new Model(
      model,
      this._getInitialState(model.name)
    )

    const depends = model._depends
    if (depends) {
      depends.forEach((depend) => {
        // trigger depends initial
        const depends = this._getModelInstance(depend)
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
    this._hooks.map((hook) => {
      hook.onModelInstanced?.(internalModelInstanceProxy)
    })

    let $state: Model<AnyModel>['getState']
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
      } as Model<AnyModel>['getState']
    } else {
      $state = internalModelInstance.getState
    }

    const getModels = this._getModelInstance.bind(this)
    const $views = {} as Views<AnyModel['views']>
    createViews($views, internalModelInstance, getModels)

    const $createSelector = <TReturn>(
      selector: Selector<AnyModel, TReturn>
    ) => {
      return createSelector(internalModelInstance, getModels, selector)
    }

    const $actions = {} as Actions<AnyModel>
    createReducers($actions, internalModelInstance)
    createActions($actions, internalModelInstance, getModels)

    const publicApi: ModelInstance<AnyModel> = getPublicApi(
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
    this._models.set(modelName, redoxCacheValue)
    return redoxCacheValue
  }

  private _getInitialState(name: string): State | undefined {
    const result = this._initialState[name]
    if (result) {
      delete this._initialState[name]
    }
    return result
  }
}

export function redox({ initialState, plugins }: RedoxOptions): RedoxStore {
  return new RedoxImpl(initialState, plugins)
}
