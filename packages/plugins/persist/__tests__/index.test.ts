import { redox } from '@shuvi/redox'
import createMemoryStorage from './utils/createMemoryStorage'
import redoxPersist, { persistModel } from '../src/index'
import getStoredState from '../src/getStoredState'
import { a } from './models/a'
import { b } from './models/b'
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

describe('persist plugin worked:', () => {
	test('blacklist worked', async () => {
		const modelManager = redox({
			plugins: [
				[
					redoxPersist,
					{
						...config,
						blacklist: ['a'],
					},
				],
			],
		})
		await delay(100)
		const aStore = modelManager.get(a)
		aStore.add()
		const bStore = modelManager.get(b)
		bStore.add()
		await delay(100)
		let StorageState = await getStoredState(config)
		expect(StorageState).toStrictEqual({
			_persist: { rehydrated: true, version: -1 },
			b: { b: 1 },
		})
	})

	test('whitelist worked', async () => {
		const modelManager = redox({
			plugins: [
				[
					redoxPersist,
					{
						...config,
						whitelist: ['a'],
					},
				],
			],
		})
		await delay(100)
		const aStore = modelManager.get(a)
		aStore.add()
		const bStore = modelManager.get(b)
		bStore.add()
		await delay(100)
		let StorageState = await getStoredState(config)
		expect(StorageState).toStrictEqual({
			_persist: { rehydrated: true, version: -1 },
			a: { a: 1 },
		})
	})

	test('migrate worked', async () => {
		const modelManager = redox({
			plugins: [
				[
					redoxPersist,
					{
						...config,
						migrate: function (StorageState: any, version: number) {
							return { a: { a: 1 } }
						},
					},
				],
			],
		})
		const aStore = modelManager.get(a)
		await delay(100)
		expect(aStore.$state()).toStrictEqual({ a: 1 })
	})

	test('version worked', async () => {
		const modelManager = redox({
			plugins: [
				[
					redoxPersist,
					{
						...config,
						version: 1,
					},
				],
			],
		})
		await delay(100)
		const aStore = modelManager.get(a)
		aStore.add()
		await delay(100)
		let StorageState = await getStoredState(config)
		expect(StorageState).toStrictEqual({
			_persist: { rehydrated: true, version: 1 },
			a: { a: 1 },
		})
	})
})
