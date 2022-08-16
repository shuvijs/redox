import { emptyObject, hasOwn } from '../utils'
import { AnyModel } from './defineModel'
import { Actions } from './modelOptions'
import { RedoxCacheValue } from './types'
import type { Model } from './model'

// list for not allow to access publicApi property
const ACTION_CONTEXT_BLACK_LIST = ['$createView', '$actions', '$views']

function createActionContext(
  publicApi: RedoxCacheValue['publicApi'],
  depends: Record<string, any> = emptyObject
) {
  return function get(
    target: Record<string | symbol, any>,
    key: string | symbol
  ) {
    if (hasOwn(publicApi, key) && !ACTION_CONTEXT_BLACK_LIST.includes(key)) {
      return publicApi[key]
    }
    if (key === '$dep' && hasOwn(depends, key)) {
      return depends[key]
    }
    return target[key]
  }
}

export const createActions = <IModel extends AnyModel>(
  $actions: Actions<IModel>,
  internalModelInstance: Model<IModel>,
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
      // generate depends context
      const dependsApi = {} as Record<string, any>
      const depends = internalModelInstance.model._depends
      if (depends) {
        depends.forEach((depend) => {
          const { publicApi } = getCacheValue(depend)
          dependsApi[depend.name] = new Proxy(emptyObject, {
            get: createActionContext(publicApi),
          })
        })
      }
      // generate this ref context
      const instance = getCacheValue(internalModelInstance.model)
      const publicApi = instance.publicApi
      const thisRefProxy = new Proxy(emptyObject, {
        get: createActionContext(publicApi, { $dep: dependsApi }),
      })
      return action.call(thisRefProxy, ...args)
    }
  })
}
