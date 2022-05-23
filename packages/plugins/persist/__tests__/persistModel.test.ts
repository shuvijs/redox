import { redox } from '@shuvi/redox'
import createMemoryStorage from './utils/createMemoryStorage'
import redoxPersist, { persistModel } from '../src/index'
import getStoredState from '../src/getStoredState'
import { a } from './models/a'
import { delay } from './utils/delay'

let memoryStorage = createMemoryStorage()

let config = {
	key: 'persist-reducer-test',
	storage: memoryStorage,
}

beforeEach(() => {
	memoryStorage = createMemoryStorage()
	config = {
		key: 'persist-reducer-test',
		storage: memoryStorage,
	}
})

describe('persistModel worked:', () => {
	test('$state worked', async () => {
		const modelManager = redox({ plugins: [[redoxPersist, config]] })
		const persistStore = modelManager.get(persistModel)
		expect(persistStore.$state()).toStrictEqual({
			rehydrated: false,
			version: -1,
		})
		const aStore = modelManager.get(a)
		aStore.add()
		await delay(100)
		expect(persistStore.$state()).toStrictEqual({
			rehydrated: true,
			version: -1,
		})
		persistStore.$modify((state) => (state.version = 1))
		expect(persistStore.$state()).toStrictEqual({
			rehydrated: true,
			version: 1,
		})
	})

	test('togglePause worked', async () => {
		const modelManager = redox({ plugins: [[redoxPersist, config]] })
		const persistStore = modelManager.get(persistModel)
		expect(persistStore.$state()).toStrictEqual({
			rehydrated: false,
			version: -1,
		})
		await delay(100)
		const aStore = modelManager.get(a)
		aStore.add()
		await delay(100)
		let StorageState = await getStoredState(config)
		expect(StorageState).toStrictEqual({
			_persist: { rehydrated: true, version: -1 },
			a: { a: 1 },
		})
		persistStore.togglePause()
		aStore.add()
		await delay(100)
		StorageState = await getStoredState(config)
		expect(StorageState).toStrictEqual({
			_persist: { rehydrated: true, version: -1 },
			a: { a: 1 },
		})
		persistStore.togglePause()
		await delay(100)
		StorageState = await getStoredState(config)
		expect(StorageState).toStrictEqual({
			_persist: { rehydrated: true, version: -1 },
			a: { a: 2 },
		})
	})

	test('flush worked', async () => {
		const modelManager = redox({ plugins: [[redoxPersist, config]] })
		const persistStore = modelManager.get(persistModel)
		expect(persistStore.$state()).toStrictEqual({
			rehydrated: false,
			version: -1,
		})
		await delay(100)
		const aStore = modelManager.get(a)
		aStore.add()
		persistStore.flush()
		await delay(100)
		let StorageState = await getStoredState(config)
		expect(StorageState).toStrictEqual({
			_persist: { rehydrated: true, version: -1 },
			a: { a: 1 },
		})
	})

	test('purge worked', async () => {
		const modelManager = redox({ plugins: [[redoxPersist, config]] })
		const persistStore = modelManager.get(persistModel)
		expect(persistStore.$state()).toStrictEqual({
			rehydrated: false,
			version: -1,
		})
		await delay(100)
		const aStore = modelManager.get(a)
		aStore.add()
		await delay(100)
		let StorageState = await getStoredState(config)
		expect(StorageState).toStrictEqual({
			_persist: { rehydrated: true, version: -1 },
			a: { a: 1 },
		})
		persistStore.purge()
		StorageState = await getStoredState(config)
		expect(StorageState).toStrictEqual(undefined)
	})
})
