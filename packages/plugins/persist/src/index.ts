import { IPlugin, redox, Store, AnyModel, ReduxReducer } from '@shuvi/redox'
import createPersist from './createPersist'
import getStoredState from './getStoredState'
import { createWebStorage } from './storage'
import { persistModel } from './persistModel'
import { IStorageState, PersistOptions } from './types'

const ACTIONTYPE = '_PERSISTSET'

type StoreProxy = Parameters<
	ReturnType<typeof redoxPersist>['onStoreCreated'] & Function
> extends infer P
	? P extends { 0: any }
		? P[0]
		: undefined
	: undefined

function _rehydrated(storageState: IStorageState, Store: StoreProxy) {
	if (storageState && Store.name && storageState[Store.name]) {
		Store.dispatch({
			type: ACTIONTYPE,
			payload: storageState[Store.name],
		})
	}
}

const redoxPersist: IPlugin<AnyModel, PersistOptions> = function (options) {
	const persist = createPersist(options)
	let persistStore: Store<typeof persistModel>
	let _modelManager: ReturnType<typeof redox>
	const unSubscribes = new Set<() => void>()
	const collectLoadingStore = new Set<StoreProxy>()
	let _storageState: IStorageState
	let _isPause = false
	let _isInit = false
	return {
		onInit(modelManager) {
			persistStore = modelManager.get(persistModel)
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
						persist.update(_modelManager.getState())
					}
				},
			})
			_modelManager = modelManager
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
		onStoreCreated(Store) {
			Store.onReducer(function persistReducer(
				originReducer: ReduxReducer
			): ReduxReducer {
				return function (state, action) {
					if (action.type === ACTIONTYPE) {
						return action.payload
					}
					return originReducer(state, action)
				}
			})
			if (_isInit) {
				_rehydrated(_storageState, Store)
			} else {
				collectLoadingStore.add(Store)
			}
			const unSubscribe = Store.subscribe(function () {
				if (!_isPause && _isInit) {
					persist.update(_modelManager.getState())
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
