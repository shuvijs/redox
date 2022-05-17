import { IPlugin, redox, Store, AnyModel } from '@shuvi/redox'
import createPersist from './createPersist'
import getStoredState from './getStoredState'
import localStorage, { createWebStorage } from './storage'
import { persistModel } from './persistModel'
import { IStorageState, PersistOptions } from './types'

type StoreProxy = Parameters<
	ReturnType<typeof redoxPersist>['onStoreCreated'] & Function
> extends infer P
	? P extends { 0: any }
		? P[0]
		: undefined
	: undefined

function setStorageState(storageState: IStorageState, Store: StoreProxy) {
	if (storageState && Store.model.name && storageState[Store.model.name]) {
		console.log(
			'storageState[Store.model.name]: ',
			storageState[Store.model.name]
		)
		Store.$set(storageState[Store.model.name])
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
					_isPause = !!_isPause
				},
			})
			_modelManager = modelManager
			if (typeof options.version !== 'undefined') {
				persistStore.setVersion(options.version)
			}
			getStoredState(options)
				.then((state) => {
					console.log('state: ', state)
					return Promise.resolve(
						options.migrate?.(state, persistStore.$state().version) || state
					)
						.then((migrateState) => {
							_storageState = migrateState
							for (const Store of collectLoadingStore) {
								setStorageState(_storageState, Store)
							}
							// persistStore.$modify(s=>s.isLoading = false)
							persistStore.setRehydrated(true)
							collectLoadingStore.clear()
						})
						.catch((err) => {
							console.error(`options migrate error:`, err)
						})
				})
				.catch((err) => {
					console.error(`getStoredState error:`, err)
				})
			_isInit = true
		},
		onStoreCreated(Store) {
			if (_isInit) {
				setStorageState(_storageState, Store)
			} else {
				collectLoadingStore.add(Store)
			}
			const unSubscribe = Store.subscribe(function () {
				if (!_isPause) {
					persist.update(_modelManager.getSnapshot())
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

export { localStorage, createWebStorage }

export * from './types'

export default redoxPersist
