import { defineModel, redox, IPlugin } from '../src'
let manager: ReturnType<typeof redox>

describe('redox', () => {
	it('always return a new instance', () => {
		const managerA = redox()
		const managerB = redox()
		expect(managerA).not.toBe(managerB)
	})

	it('should have the proper api', () => {
		manager = redox()
		const model = defineModel({
			name: 'model',
			state: { value: 0 },
			reducers: {
				reducerOne: (state) => {
					return { value: state.value + 1 }
				},
			},
			actions: {
				actionOne() {},
			},
			views: {
				viewOne() {},
			},
		})

		const store = manager.get(model)
		expect(typeof store.$state).toBe('object')
		expect(typeof store.$modify).toBe('function')
		expect(typeof store.$set).toBe('function')
		expect(typeof store.reducerOne).toBe('function')
		expect(typeof store.actionOne).toBe('function')
		expect(typeof store.viewOne).toBe('undefined')
	})

	it('should init store by initialStage', () => {
		manager = redox({
			initialState: {
				one: {
					value: 'one',
				},
				two: {
					value: 'two',
				},
			},
		})
		const modelOne = defineModel({
			name: 'one',
			state: { value: 0 },
		})
		const modelTwo = defineModel({
			name: 'two',
			state: { value: 0 },
		})
		const storeOne = manager.get(modelOne)
		const storeTwo = manager.get(modelTwo)
		expect(storeOne.$state.value).toBe('one')
		expect(storeTwo.$state.value).toBe('two')
	})

	it('should init dependencies', () => {
		manager = redox()
		const depend = defineModel({
			name: 'depend',
			state: { depend: 0 },
			reducers: {
				increment(state, payload: number) {
					state.depend = state.depend + payload
				},
			},
		})
		const count = defineModel(
			{
				name: 'count',
				state: { value: 0 },
				reducers: {
					increment(state, payload: number) {
						state.value = state.value + payload
					},
				},
				actions: {
					dependAdd() {
						this.$dep.depend.increment(1)
					},
				},
			},
			[depend]
		)

		const store = manager.get(count)
		store.dependAdd()
		expect(manager.getState()).toEqual({
			count: { value: 0 },
			depend: { depend: 1 },
		})
	})

	it('should access dependencies by index', () => {
		manager = redox()
		const depend = defineModel({
			state: { depend: 0 },
			reducers: {
				increment(state, payload: number) {
					state.depend = state.depend + payload
				},
			},
		})
		const count = defineModel(
			{
				name: 'count',
				state: { value: 0 },
				reducers: {
					increment(state, payload: number) {
						state.value = state.value + payload
					},
				},
				actions: {
					dependAdd() {
						this.$dep[0].increment(1)
					},
				},
			},
			[depend]
		)

		const store = manager.get(count)
		store.dependAdd()
		expect(manager.getState()).toEqual({
			count: { value: 0 },
			0: { depend: 1 },
		})
	})

	it('getState should return the newest state', () => {
		manager = redox()
		const count0 = defineModel({
			name: 'count0',
			state: { value: 0 },
			reducers: {
				increment(state, payload: number) {
					state.value = state.value + payload
				},
			},
		})
		const count1 = defineModel({
			name: 'count1',
			state: { value: 0 },
			reducers: {
				increment(state, payload: number) {
					state.value = state.value + payload
				},
			},
		})

		const store0 = manager.get(count0)
		const store1 = manager.get(count1)
		expect(manager.getState()).toEqual({
			count0: { value: 0 },
			count1: { value: 0 },
		})
		store0.increment(1)
		expect(manager.getState()).toEqual({
			count0: { value: 1 },
			count1: { value: 0 },
		})
	})

	test('should destroy', () => {
		manager = redox()
		const model = defineModel({
			name: 'model',
			state: { value: 0 },
			reducers: {
				increment(state, payload: number = 1) {
					state.value = state.value + payload
				},
			},
		})

		const store = manager.get(model)
		store.increment(1)
		expect(store.$state.value).toBe(1)

		manager.destroy()
		const newStore = manager.get(model)
		expect(newStore).not.toBe(store)
		expect(newStore.$state.value).toBe(0)
	})

	test('subscribes and unsubscribes should work', () => {
		manager = redox()
		let firstCount = 0
		const first = defineModel({
			name: 'first',
			state: { value: 0 },
			reducers: {
				addOne: (state) => {
					return { value: state.value + 1 }
				},
			},
		})
		const firstStore = manager.get(first)
		manager.subscribe(first, () => {
			firstCount++
		})
		let secondCount = 0
		const second = defineModel({
			name: 'second',
			state: { value: 0 },
			reducers: {
				addOne: (state, payload: number) => ({
					value: state.value + payload,
				}),
			},
		})
		const secondStore = manager.get(second)
		const unSubscribeSecond = manager.subscribe(second, () => {
			secondCount++
		})

		firstStore.addOne()
		expect(firstCount).toBe(1)
		firstStore.addOne()
		expect(firstCount).toBe(2)
		expect(firstStore.$state).toStrictEqual({ value: 2 })
		expect(secondStore.$state).toStrictEqual({ value: 0 })

		secondStore.addOne(5)
		expect(secondCount).toBe(1)
		expect(secondStore.$state).toStrictEqual({ value: 5 })

		unSubscribeSecond()
		secondStore.addOne(5)
		expect(secondCount).toBe(1)
	})

	it('should trigger change when dependencies have changed', () => {
		manager = redox()
		let dependCount = 0
		let storeCount = 0
		const first = defineModel({
			name: 'first',
			state: { value: 0 },
			reducers: {
				addOne: (state) => {
					return { value: state.value + 1 }
				},
			},
		})
		const depend = manager.get(first)
		manager.subscribe(first, () => {
			console.log('dependCount: ', dependCount)
			dependCount++
		})
		const second = defineModel(
			{
				name: 'second',
				state: { value: 0 },
				reducers: {
					addOne: (state, payload: number) => ({
						value: state.value + payload,
					}),
				},
			},
			[first]
		)

		const store = manager.get(second)
		manager.subscribe(second, () => {
			storeCount++
		})

		depend.addOne()
		expect(dependCount).toBe(1)
		expect(storeCount).toBe(1)
		depend.addOne()
		expect(dependCount).toBe(2)
		expect(storeCount).toBe(2)
		store.addOne(1)
		expect(dependCount).toBe(2)
		expect(storeCount).toBe(3)
	})

	describe('plugin', () => {
		it('should have the proper api', () => {
			const onInit = jest.fn()
			const onModel = jest.fn()
			const onStoreCreated = jest.fn()
			const onDestroy = jest.fn()
			const plugin: IPlugin = () => {
				return {
					onInit,
					onModel,
					onStoreCreated,
					onDestroy,
				}
			}

			let initialState = {}
			const manager = redox({
				initialState,
				plugins: [[plugin, {}]],
			})

			expect(onInit).toHaveBeenCalledWith(manager, initialState)

			const model = defineModel({
				name: 'model',
				state: { value: '' },
			})
			manager.get(model)
			expect(onModel).toHaveBeenCalledWith(model)
			expect(typeof onStoreCreated.mock.calls[0][0].dispatch).toBe('function')

			manager.destroy()
			expect(onDestroy).toHaveBeenCalledWith()
		})
	})
})
