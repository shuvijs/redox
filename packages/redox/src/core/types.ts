import { Store, AnyModel, AnyAction, State } from '../types'
import type { RedoxStore } from '../redoxStore'

export type StoreAndApi = {
  store: RedoxStore<AnyModel>
  storeApi: Store<AnyModel>
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

export const proxyMethods = [
  'name',
  'getState',
  'dispatch',
  'subscribe',
  'reducer',
] as const

export type IProxyMethods = typeof proxyMethods[number]

type RedoxStoreProxy = Pick<RedoxStore<AnyModel>, IProxyMethods>

export type IPlugin<IModel extends AnyModel = AnyModel, Option = any> = (
  option: Option
) => pluginHook<IModel>
