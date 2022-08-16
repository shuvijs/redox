import { AnyModel } from './defineModel'
import { ModelInstance, State, Action } from './modelOptions'
import type { Model } from './model'

export type Dispatch = (action: Action) => Action

export type RedoxCacheValue = {
  internalModelInstance: Model<AnyModel>
  publicApi: ModelInstance<AnyModel>
}

export type RedoxStoreCache = Map<string, RedoxCacheValue>

type unSubscribe = () => void

export type RedoxStore = {
  getModel<IModel extends AnyModel>(model: IModel): ModelInstance<IModel>
  getState(): Record<string, State>
  dispatch(action: Action): void
  subscribe(model: AnyModel, fn: () => any): unSubscribe
  destroy(): void
}

export type PluginHook<IModel extends AnyModel = AnyModel> = {
  onInit?(redoxStore: RedoxStore, initialState: Record<string, State>): void
  onModel?(model: IModel): void
  onModelInstanced?(instance: InternalModelProxy): void
  onDestroy?(): void
}

export const proxyMethods = [
  'name',
  'getState',
  'dispatch',
  'subscribe',
  'reducer',
] as const

export type ProxyMethods = typeof proxyMethods[number]

type InternalModelProxy = Pick<Model<AnyModel>, ProxyMethods>

export type Plugin<IModel extends AnyModel = AnyModel, Option = any> = (
  option: Option
) => PluginHook<IModel>
