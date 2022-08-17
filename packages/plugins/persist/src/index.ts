import { Plugin, redox, AnyModel, ModelPublicInstance } from '@shuvi/redox'
import createPersist from './createPersist'
import getStoredState from './getStoredState'
import { createWebStorage } from './storage'
import { persistModel } from './persistModel'
import { IStorageState, PersistOptions } from './types'

const ACTIONTYPE = '_PERSISTSET'

type StoreProxy = Parameters<
  ReturnType<typeof redoxPersist>['onModelInstanced'] & Function
> extends infer P
  ? P extends { 0: any }
    ? P[0]
    : undefined
  : undefined

function _rehydrated(storageState: IStorageState, store: StoreProxy) {
  if (storageState && store.name && storageState[store.name]) {
    store.dispatch({
      type: ACTIONTYPE,
      payload: storageState[store.name],
    })
  }
}

const redoxPersist: Plugin<AnyModel, PersistOptions> = function (options) {
  const persist = createPersist(options)
  let persistStore: ModelPublicInstance<typeof persistModel>
  let _redoxStore: ReturnType<typeof redox>
  const unSubscribes = new Set<() => void>()
  const collectLoadingStore = new Set<StoreProxy>()
  let _storageState: IStorageState
  let _isPause = false
  let _isInit = false
  return {
    onInit(redoxStore) {
      _redoxStore = redoxStore
      persistStore = redoxStore.getModel(persistModel)
      Object.assign(persistStore, {
        purge() {
          return persist.purge()
        },
        flush() {
          return persist.flush()
        },
        togglePause() {
          _isPause = !_isPause
          if (!_isPause && _isInit) {
            persist.update(_redoxStore.getState())
          }
        },
      })
      if (typeof options.version !== 'undefined') {
        persistStore.$modify((state) => (state.version = options.version!))
      }
      getStoredState(options)
        .then((state) => {
          return Promise.resolve(
            options.migrate?.(state, persistStore.$state.version) || state
          )
            .then((migrateState) => {
              _storageState = migrateState
              for (const Store of collectLoadingStore) {
                _rehydrated(_storageState, Store)
              }
              persistStore.$modify((s) => (s.rehydrated = true))
              collectLoadingStore.clear()
              _isInit = true
            })
            .catch((err) => {
              console.error(`redoxPersist options.migrate error:`, err)
            })
        })
        .catch((err) => {
          console.error(`getStoredState inner error:`, err)
        })
    },
    onModelInstanced(instance) {
      const originReducer = instance.reducer
      instance.reducer = function (state, action) {
        if (action.type === ACTIONTYPE) {
          return action.payload
        }
        return originReducer(state, action)
      }
      if (_isInit) {
        _rehydrated(_storageState, instance)
      } else {
        collectLoadingStore.add(instance)
      }
      const unSubscribe = instance.subscribe(function () {
        if (!_isPause && _isInit) {
          persist.update(_redoxStore.getState())
        }
      })
      unSubscribes.add(unSubscribe)
    },
    onDestroy() {
      for (const unSubscribe of unSubscribes) {
        unSubscribe()
      }
    },
  }
}

export { createWebStorage, persistModel }

export * from './types'

export default redoxPersist
