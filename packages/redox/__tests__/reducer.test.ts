import { defineModel, redox } from '../src'
let manager: ReturnType<typeof redox>
beforeEach(() => {
	manager = redox()
})
describe('reducer worked:', () => {
	describe('action:', () => {
		test('should be called in the form "reducerName"', () => {
			const count = defineModel({
				name: 'count',
				state: { value: 0 },
				reducers: {
					add: (state) => ({
						value: state.value + 1,
					}),
				},
			})

			const store = manager.get(count)

			store.add()

			expect(store.$state()).toEqual({ value: 1 })
		})

		test('should return an action', () => {
			const count = defineModel({
				name: 'count',
				state: { value: 0 },
				reducers: {
					add: (state) => ({
						value: state.value + 1,
					}),
				},
			})

			const store = manager.get(count)

			const dispatched = store.add()

			expect(store.$state()).toEqual({ value: 1 })
			expect(dispatched).toEqual({ type: 'add' })
		})

		test('should dispatch multiple actions', () => {
			const count = defineModel({
				name: 'count',
				state: { value: 0 },
				reducers: {
					add: (state) => ({
						value: state.value + 1,
					}),
				},
			})

			const store = manager.get(count)

			store.add()
			store.add()

			expect(store.$state()).toEqual({ value: 2 })
		})
	})

	test('should include a payload if it is a false value', () => {
		const count = defineModel({
			name: 'a',
			state: {
				value: true,
			},
			reducers: {
				toggle: (_, payload: boolean) => ({
					value: payload,
				}),
			},
		})

		const store = manager.get(count)

		store.toggle(false)

		expect(store.$state()).toEqual({ value: false })
	})

	describe('support immer:', () => {
		test('should load the immer plugin with a basic literal', () => {
			const count = defineModel({
				name: 'count',
				state: { value: 0 },
				reducers: {
					add(state) {
						state.value = state.value + 1
					},
				},
			})

			const store = manager.get(count)

			store.add()

			expect(store.$state()).toEqual({ value: 1 })
		})

		test('should load the immer plugin with a nullable basic literal', () => {
			const model = defineModel({
				name: 'model',
				state: { value: null } as { value: number | null },
				reducers: {
					set(state, payload: number) {
						state.value = payload
					},
				},
			})

			const store = manager.get(model)

			store.set(1)

			expect(store.$state()).toEqual({ value: 1 })
		})

		test('should load the immer plugin with a object condition', () => {
			const todo = [
				{
					todo: 'Learn typescript',
					done: true,
				},
				{
					todo: 'Try immer',
					done: false,
				},
			]
			const todoModel = defineModel({
				name: 'todo',
				state: {
					value: todo,
				},
				reducers: {
					done(state) {
						state.value.push({ todo: 'Tweet about it', done: false })
						state.value[1].done = true
					},
				},
			})

			const store = manager.get(todoModel)

			store.done()
			const newState = store.$state()

			expect(todo.length).toBe(2)
			expect(newState.value).toHaveLength(3)

			expect(todo[1].done).toBe(false)
			expect(newState.value[1].done).toEqual(true)
		})
	})

	describe('params:', () => {
		test('should pass state as the first reducer param', () => {
			const count = defineModel({
				name: 'count',
				state: { value: 0 },
				reducers: {
					doNothing: (state) => state,
				},
			})

			const store = manager.get(count)

			store.doNothing()

			expect(store.$state()).toEqual({ value: 0 })
		})

		test('should pass payload as the second param', () => {
			const count = defineModel({
				name: 'count',
				state: {
					countIds: [] as number[],
				},
				reducers: {
					incrementBy: (state, payload: number) => {
						return {
							countIds: [...state.countIds, payload],
						}
					},
				},
			})

			const store = manager.get(count)

			store.incrementBy(5)

			expect(store.$state().countIds).toStrictEqual([5])
		})
	})

	describe('promise action', () => {
		beforeEach(() => {
			manager = redox()
		})

		test('should return a promise from an action', () => {
			const count = defineModel({
				name: 'count',
				state: { value: 0 },
				reducers: {
					addOne: (state) => {
						value: state.value + 1
					},
				},
				actions: {
					async callAddOne(): Promise<void> {
						this.addOne()
					},
				},
			})

			const store = manager.get(count)

			const dispatched = store.callAddOne()

			expect(typeof dispatched.then).toBe('function')
		})

		test('should return a promise that resolves to a value from an action', async () => {
			const count = defineModel({
				name: 'count',
				state: { value: 0 },
				reducers: {
					addOne: (state) => ({ value: state.value + 1 }),
				},
				actions: {
					async callAddOne(): Promise<Record<string, any>> {
						this.addOne()
						return {
							added: true,
						}
					},
				},
			})

			const store = manager.get(count)

			const dispatched = store.callAddOne()

			expect(typeof (dispatched as any).then).toBe('function')

			const value = await dispatched
			expect(value).toEqual({ added: true })
		})
	})
})
