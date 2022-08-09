import { AnyModel, DispatchOfModel } from '../types'
import { RedoxCacheValue } from './types'
import type { InternalModel } from '../internal-model'

export const createActions = <IModel extends AnyModel>(
  $actions: DispatchOfModel<IModel>,
  internalModelInstance: InternalModel<IModel>,
  getCacheValue: (m: AnyModel) => RedoxCacheValue
): void => {
  const actions = internalModelInstance.model.actions
  if (!actions) {
    return
  }
  // map actions names to dispatch actions
  const actionKeys = Object.keys(actions) as Array<keyof IModel['actions']>
  actionKeys.forEach((actionsName) => {
    // @ts-ignore
    $actions[actionsName as string] = function (...args: any[]) {
      const action = actions[actionsName]
      const dependsApi = {} as any
      const depends = internalModelInstance.model._depends
      if (depends) {
        depends.forEach((depend) => {
          const { publicApi } = getCacheValue(depend)
          const { $createView, $actions, $views, $state, ...dependApiRest } =
            publicApi
          const res = dependApiRest
          Object.defineProperty(res, '$state', {
            enumerable: true,
            get() {
              return publicApi.$state
            },
          })
          dependsApi[depend.name] = res
        })
      }
      const instance = getCacheValue(internalModelInstance.model)
      const publicApi = instance.publicApi
      const { $createView, $actions, $views, $state, ...storeApiRest } =
        publicApi
      const thisPoint = Object.assign(storeApiRest, { $dep: dependsApi })
      Object.defineProperty(thisPoint, '$state', {
        get() {
          return publicApi.$state
        },
      })
      return action.call(thisPoint, ...args)
    }
  })
}
