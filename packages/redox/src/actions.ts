import { AnyModel, Store, DispatchOfModel } from './types'
import type { RedoxStore, StoreAndApi } from './redoxStore'

export const createActions = <IModel extends AnyModel>(
  $actions: DispatchOfModel<IModel>,
  redoxStore: RedoxStore<IModel>,
  getRedox: (m: AnyModel) => StoreAndApi
): void => {
  const actions = redoxStore.model.actions
  if (!actions) {
    return
  }
  // map actions names to dispatch actions
  const actionKeys = Object.keys(actions) as Array<keyof IModel['actions']>
  actionKeys.forEach((actionsName) => {
    // @ts-ignore
    $actions[actionsName as string] = function (...args: any[]) {
      const action = actions[actionsName]
      const dependsStoreApi = {} as any
      const depends = redoxStore.model._depends
      if (depends) {
        depends.forEach((depend) => {
          const { storeApi } = getRedox(depend)
          const { $createView, $actions, $views, $state, ...dependApiRest } =
            storeApi
          const res = dependApiRest
          Object.defineProperty(res, '$state', {
            enumerable: true,
            get() {
              return storeApi.$state
            },
          })
          dependsStoreApi[depend.name] = res
        })
      }
      const storeAndStoreApi = getRedox(redoxStore.model)
      const storeApi = storeAndStoreApi.storeApi
      const { $createView, $actions, $views, $state, ...storeApiRest } =
        storeApi
      const thisPoint = Object.assign(storeApiRest, { $dep: dependsStoreApi })
      Object.defineProperty(thisPoint, '$state', {
        get() {
          return storeApi.$state
        },
      })
      return action.call(thisPoint, ...args)
    }
  })
}
