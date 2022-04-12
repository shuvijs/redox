import { defineModel, redox } from '../src'
let manager: ReturnType<typeof redox>

describe('effects:', () => {
	beforeEach(() => {
		manager = redox()
	})
	test('should create an action', () => {
		const count = defineModel({
			name: 'count',
			state: { value: 0},
			reducers: {},
			effects: {
				add: (): number => 1,
			},
		})

		const store = manager.get(count)

		expect(typeof store.dispatch.add).toBe('function')
	})

	test('first param should be payload', async () => {
		let value = 1

		const count = defineModel({
			name: 'count',
			state: { value: 0 },
			effects: {
				add(payload: number): void {
					value += payload
				},
			},
			reducers: {},
		})

		const store = manager.get(count)

		store.dispatch({ type: 'add', payload: 4 })

		expect(value).toBe(5)
	})

	test('second param should contain state', async () => {
		let secondParam: any

		const count = defineModel({
			name: 'count',
			state: { value: 7 },
			reducers: {
				add: (s, p: number) => ({value: s.value + p}),
			},
			effects: {
				makeCall(_: number, state): void {
					secondParam = state.value
				},
			},
		})

		const store = manager.get(count)

		store.dispatch.makeCall(2)

		expect(secondParam).toBe(7)
	})

	test('third param should contain dependsStore', async () => {
		let thirdParam: any

		const count = defineModel({
			name: 'count',
			state: { count: 0 },
			reducers: {
				add: (s, p: number) => ({
					count: s.count + p
				}),
			},
			effects: {
				makeCall(_: number, _state): void {},
			},
		})

		const count0 = defineModel({
			name: 'count0',
			state: { value: 7 },
			reducers: {
				add: (s, p: number) => ({value: s.value + p}),
			},
			effects: {
				makeCall(_: void, _state, depends): void {
					thirdParam = depends;
					depends.dispatch.count.add(1);
				},
			},
		}, [count])

		const store = manager.get(count0)

		store.dispatch.makeCall()
		expect(thirdParam.getState()).toStrictEqual({ count: {count: 1} })
		expect(typeof thirdParam.dispatch.count.makeCall).toBe("function")
	})

	test('should create an effect dynamically', () => {

		const example = defineModel({
			name: 'example',
			state: { value: 0},
			reducers: {
				addOne: () => ({ value: 1}),
			},
			effects: {
				add(this: any): void {
					this.addOne()
				},
			},
		})

		const store = manager.get(example)

		store.dispatch({ type: 'add' })
		expect(store.getState()).toStrictEqual({value: 1})
	})

	test('should be able to trigger another action', async () => {

		const example = defineModel({
			name: 'example',
			state: { value: 0},
			reducers: {
				addOne: (s) => ({ value: s.value + 1}),
			},
			effects: {
				async asyncAddOneArrow(): Promise<void> {
					await this.addOne()
				},
			},
		})

		const store = manager.get(example)

		await store.dispatch.asyncAddOneArrow()

		expect(store.getState()).toStrictEqual({value:1})
	})

	test('should be able trigger a local reducer using functions and `this`', async () => {

		const example = defineModel({
			name: 'example',
			state: { value: 0},
			reducers: {
				addOne: (s) => ({ value: s.value + 1}),
			},
			effects: {
				async asyncAddOne(): Promise<void> {
					await this.addOne()
				},
			},
		})

		const store = manager.get(example)

		await store.dispatch.asyncAddOne()

		expect(store.getState()).toStrictEqual({value: 1})
	})

	test('should be able to trigger another action with a value', async () => {

		const example = defineModel({
			name: 'example',
			state: { value: 2},
			reducers: {
				addBy: (state, payload: number) => ({value: state.value + payload})
			},
			effects: {
				async asyncAddBy(value: number): Promise<void> {
					await this.addBy(value)
				},
			},
		})

		const store = manager.get(example)

		await store.dispatch.asyncAddBy(5)

		expect(store.getState()).toStrictEqual({value:7})
	})

	test('should be able to trigger another action w/ an object value', async () => {

		const example = defineModel({
			name: 'example',
			state: { value: 3},
			reducers: {
				addBy: (state, payload: { value: number }) => ({value: state.value + payload.value}),
			},
			effects: {
				async asyncAddBy(payload: { value: number }): Promise<void> {
					await this.addBy(payload)
				},
			},
		})

		const store = manager.get(example)

		await store.dispatch.asyncAddBy({ value: 6 })

		expect(store.getState()).toStrictEqual({value: 9})
	})

	test('should be able to trigger another action w/ another action', async () => {
		const example = defineModel({
			name: 'example',
			state: { value: 0},
			reducers: {
				addOne: (state) => ({value: state.value + 1}),
			},
			effects: {
				async asyncAddOne(): Promise<void> {
					await this.addOne()
				},
				async asyncCallAddOne(): Promise<void> {
					await this.asyncAddOne()
				},
			},
		})

		const store = manager.get(example)

		await store.dispatch.asyncCallAddOne()

		expect(store.getState()).toStrictEqual({value: 1})
	})

	test('should be able to trigger another action w/ multiple actions', async () => {

		const example = defineModel({
			name: 'example',
			state: { value: 0},
			reducers: {
				addBy: (state, payload: number) => ({value: state.value + payload}),
			},
			effects: {
				async asyncAddOne(): Promise<void> {
					await this.addBy(1)
				},
				async asyncAddThree(): Promise<void> {
					await this.addBy(3)
				},
				async asyncAddSome(): Promise<void> {
					await this.asyncAddThree()
					await this.asyncAddOne()
					await this.asyncAddOne()
				},
			},
		})

		const store = manager.get(example)

		await store.dispatch.asyncAddSome()

		expect(store.getState()).toStrictEqual({value: 5})
	})
})
