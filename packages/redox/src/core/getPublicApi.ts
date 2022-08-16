import type { Model } from './model'
import { AnyModel } from './defineModel'
import { ModelInstance, Actions, Views, Selector } from './modelOptions'
import { warn } from '../warning'

export default function getStoreApi<M extends AnyModel = AnyModel>(
  internalModelInstance: Model<M>,
  $state: () => M['state'],
  $actions: Actions<M>,
  $views: Views<M['views']>,
  $createSelector: <TReturn>(
    selector: Selector<M, TReturn>
  ) => (() => TReturn) & { clearCache: () => void }
): ModelInstance<M> {
  const store = {} as ModelInstance<M>
  store.$set = internalModelInstance.$set
  store.$patch = internalModelInstance.$patch
  store.$modify = internalModelInstance.$modify
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
        warn(`cannot set property '$state'`)
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
          warn(`cannot change view property '${viewKey}'`)
        }
        return false
      },
    })
  })
  return store
}
