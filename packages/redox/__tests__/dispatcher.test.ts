import { defineModel, redox } from '../src'
let manager: ReturnType<typeof redox>

describe('dispatch:', () => {
	beforeEach(() => {
		manager = redox()
	})
	describe('action:', () => {
		beforeEach(() => {
			manager = redox()
		})
		it('should be called in the form "reducerName"', () => {

			const count = defineModel({
				name: 'count',
				state: { value: 0 },
				reducers: {
					add: (state) => ({
						value: state.value + 1
					})
				},
			})

			const store = manager.get(count)

			store.dispatch({ type: 'add' })

			expect(store.getState()).toEqual({value: 1})
		})

		it('should be able to call dispatch directly', () => {

			const count = defineModel({
				name: 'count',
				state: { value: 0 },
				reducers: {
					addOne: (state) => ({
						value: state.value + 1
					}),
				},
			})

			const store = manager.get(count)

			store.dispatch({ type: 'addOne' })

			expect(store.getState()).toEqual({value:1})
		})

		it('should dispatch an action', () => {
		
			const count = defineModel({
				name: 'count',
				state: { value: 0 },
				reducers: {
					add: (state) => ({
						value: state.value + 1
					})
				},
			})

			const store = manager.get(count)

			const dispatched = store.dispatch.add()

			expect(store.getState()).toEqual({value:1})
			expect(typeof dispatched).toBe('object')
		})

		it('should dispatch multiple actions', () => {

			const count = defineModel({
				name: 'count',
				state: { value: 0 },
				reducers: {
					add: (state) => ({
						value: state.value + 1
					})
				},
			})

			const store = manager.get(count)

			store.dispatch.add()
			store.dispatch.add()

			expect(store.getState()).toEqual({value:2})
		})

		it('effects functions that share a name with a reducer are called after their reducer counterpart.', () => {

			const effectMock = jest.fn()
			const reducerMock = jest.fn()

			const count = defineModel({
				name: 'count',
				state: {
					count: 0,
				},
				reducers: {
					add(state) {
						reducerMock()
						return state
					},
				},
				effects:{
					add() {
						effectMock()
					},
				},
			})

			const store = manager.get(count)
			// @ts-ignore
			store.dispatch.add()
			expect(effectMock.mock.invocationCallOrder[0]).toBeGreaterThan(
				reducerMock.mock.invocationCallOrder[0]
			)
		})
	})

	it('should include a payload if it is a false value', () => {
		const count = defineModel({
			name: 'a',
			state: {
				value: true
			},
			reducers: {
				toggle: (_, payload: boolean) => ({
					value: payload
				}),
			},
		})

		const store = manager.get(count)

		store.dispatch.toggle(false)

		expect(store.getState()).toEqual({ value: false })
	})

	describe('params:', () => {
		beforeEach(() => {
			manager = redox()
		})
		it('should pass state as the first reducer param', () => {
			const count = defineModel({
				name: 'count',
				state: { value: 0 },
				reducers: {
					doNothing: (state) => state,
				},
			})

			const store = manager.get(count)

			store.dispatch.doNothing()

			expect(store.getState()).toEqual({value: 0})
		})

		it('should pass payload as the second param', () => {
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

			store.dispatch.incrementBy(5)

			expect(store.getState().countIds).toStrictEqual([5])
		})
	})

	describe('promise middleware', () => {
		beforeEach(() => {
			manager = redox()
		})
		it('should return a promise from an effect', () => {

			const count = defineModel({
				name: 'count',
				state: { value: 0 },
				reducers: {
					addOne: (state) => { value: state.value + 1},
				},
				effects: {
					async callAddOne(): Promise<void> {
						this.addOne()
					},
				},
			})


			const store = manager.get(count)

			const dispatched = store.dispatch.callAddOne()

			expect(typeof dispatched.then).toBe('function')
		})

		it('should return a promise that resolves to a value from an effect', async () => {

			const count = defineModel({
				name: 'count',
				state: { value: 0 },
				reducers: {
					addOne: (state) => ({value: state.value + 1}),
				},
				effects: {
					async callAddOne(): Promise<Record<string, any>> {
						this.addOne()
						return {
							added: true,
						}
					},
				},
			})

			const store = manager.get(count)

			const dispatched = store.dispatch.callAddOne()

			expect(typeof (dispatched as any).then).toBe('function')

			const value = await dispatched
			expect(value).toEqual({ added: true })
		})
	})
})
