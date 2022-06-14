import { defineModel, redox } from '../src'
let manager: ReturnType<typeof redox>
beforeEach(() => {
	manager = redox()
	process.env.NODE_ENV = 'development'
})

describe('actions worked:', () => {
	test('should create an action', () => {
		const count = defineModel({
			name: 'count',
			state: { value: 0 },
			reducers: {},
			actions: {
				add(): number {
					return 1
				},
			},
		})

		const store = manager.get(count)

		store.add()

		expect(typeof store.add).toBe('function')
	})

	test('define many arguments', async () => {
		const one = defineModel({
			name: 'one',
			state: { value: 0 },
			reducers: {},
			actions: {
				add(payload: number): number {
					return this.$state().value + payload
				},
			},
		})

		const two = defineModel({
			name: 'two',
			state: { value: '' },
			reducers: {
				set(_state, value: string) {
					return {
						value,
					}
				},
			},
			actions: {
				setString(arg0: any, arg1: string) {
					this.set(JSON.stringify(arg0) + JSON.stringify(arg1))
				},
			},
		})

		const three = defineModel({
			name: 'three',
			state: { value: '' },
			reducers: {
				set(_state, value: string) {
					return {
						value,
					}
				},
			},
			actions: {
				setString(arg0: any, arg1: string, arg2: { three: string }) {
					this.set(
						JSON.stringify(arg0) + JSON.stringify(arg1) + JSON.stringify(arg2)
					)
				},
			},
		})

		const four = defineModel({
			name: 'four',
			state: { value: '' },
			reducers: {
				set(_state, value: string) {
					return {
						value,
					}
				},
			},
			actions: {
				setString(
					arg0: any,
					arg1: string,
					arg2: { three: string },
					arg3?: { four: string }
				) {
					this.set(
						JSON.stringify(arg0) +
							JSON.stringify(arg1) +
							JSON.stringify(arg2) +
							JSON.stringify(arg3)
					)
				},
			},
		})

		const oneStore = manager.get(one)

		expect(oneStore.add(1)).toEqual(1)

		const twoStore = manager.get(two)
		twoStore.setString({ name: 'two' }, '2')
		expect(twoStore.$state()).toEqual({ value: '{"name":"two"}"2"' })

		const threeStore = manager.get(three)
		threeStore.setString(1, '2', { three: 'three' })
		expect(threeStore.$state()).toEqual({ value: '1"2"{"three":"three"}' })

		const fourStore = manager.get(four)
		fourStore.setString(1, '2', { three: 'three' })
		expect(fourStore.$state()).toEqual({
			value: '1"2"{"three":"three"}undefined',
		})

		fourStore.setString(1, '2', { three: 'three' }, { four: 'four' })
		expect(fourStore.$state()).toEqual({
			value: '1"2"{"three":"three"}{"four":"four"}',
		})
	})

	test('this should contain $state', async () => {
		let secondParam: any

		const count = defineModel({
			name: 'count',
			state: { value: 7 },
			reducers: {
				add: (s, p: number) => ({ value: s.value + p }),
			},
			actions: {
				makeCall(_: number): void {
					secondParam = this.$state().value
				},
			},
		})

		const store = manager.get(count)

		store.makeCall(2)

		expect(secondParam).toBe(7)
	})

	test('this.$state returns newest state', async () => {
		const state: number[] = []
		const count = defineModel({
			name: 'count',
			state: { value: 0 },
			reducers: {
				add: (s, p: number) => ({ value: s.value + p }),
			},
			actions: {
				makeCall(_: number): void {
					this.add(_)
					state.push(this.$state().value)
					this.add(_)
					state.push(this.$state().value)
				},
			},
		})

		const store = manager.get(count)

		store.makeCall(2)

		expect(state).toEqual([2, 4])
	})

	test('this.$set could change the state', () => {
		const count = defineModel({
			name: 'count',
			state: { value: 0 },
			reducers: {},
			actions: {
				makeCall(newState: { value: number }): void {
					this.$set(newState)
				},
			},
		})

		const store = manager.get(count)

		const state = { value: 2 }
		store.makeCall(state)
		expect(state.value).toEqual(store.$state().value)
	})

	test('this.$set could accept any primitive type as an argument, except Symbol and BigInt', () => {
		const anyModal = defineModel({
			name: 'anyModal',
			state: { value: 0 },
			reducers: {},
			actions: {
				setStateWith(value: any): void {
					this.$set(value)
				},
			},
		})

		const store = manager.get(anyModal)
		expect(store.$state()).toEqual({ value: 0 })

		store.$set([])
		expect(store.$state()).toEqual([])

		store.$set(0)
		expect(store.$state()).toEqual(0)

		store.$set(false)
		expect(store.$state()).toEqual(false)

		store.$set('test string')
		expect(store.$state()).toEqual('test string')
	})

	test('this.$modify could change the Object state', () => {
		const count = defineModel({
			name: 'count',
			state: { value: 0 },
			reducers: {},
			actions: {
				makeCall(modifier: (state: { value: number }) => void): void {
					this.$modify(modifier)
				},
			},
		})

		const store = manager.get(count)

		const newValue: number = 2
		const modifier = (state: any) => {
			state.value += newValue
		}
		store.makeCall(modifier)
		expect(newValue).toEqual(store.$state().value)
	})

	test('this.$modify could change the Array state', () => {
		const count = defineModel({
			name: 'count',
			state: [0],
			reducers: {},
			actions: {
				makeCall(modifier: (state: any) => void): void {
					this.$modify(modifier)
				},
			},
		})

		const store = manager.get(count)
		const originalArr = store.$state()

		const newValue: number = 2
		const modifier = (state: any) => {
			state.push(newValue)
		}
		store.makeCall(modifier)
		expect([...originalArr, newValue]).toEqual(store.$state())
	})

	test('this.$modify does not affected by returned value from the modifier', () => {
		let valueFromStore: number = 0
		const count = defineModel({
			name: 'count',
			state: { value: 0 },
			reducers: {},
			actions: {
				makeCall(modifier: (state: { value: number }) => void): void {
					this.$modify(modifier)
					valueFromStore = this.$state().value
				},
			},
		})

		const store = manager.get(count)

		const newValue: number = 2
		const modifier = (state: any) => {
			state.value += newValue
			return {
				value: 0,
			}
		}
		store.makeCall(modifier)
		expect(newValue).toEqual(valueFromStore)
	})

	test('this.$modify should modify nothing if typeof state is number', () => {
		const count = defineModel({
			name: 'count',
			state: 4,
			reducers: {},
			actions: {
				makeCall(modifier: (state: any) => void): void {
					this.$modify(modifier)
				},
			},
		})

		const store = manager.get(count)
		const originalValue = store.$state()

		const addedValue: number = 2
		const modifier = (state: any) => {
			state += addedValue
			return state + addedValue
		}
		store.makeCall(modifier)
		expect(originalValue).toEqual(store.$state())
	})

	test('this.$modify should modify nothing if typeof state is string', () => {
		const count = defineModel({
			name: 'count',
			state: 'test',
			reducers: {},
			actions: {
				makeCall(modifier: (state: any) => void): void {
					this.$modify(modifier)
				},
			},
		})

		const store = manager.get(count)
		const originalValue = store.$state()

		const appendedString: string = 'append'
		const modifier = (state: any) => {
			state += appendedString
			return state + appendedString
		}
		store.makeCall(modifier)
		expect(originalValue).toEqual(store.$state())
	})

	test('this.$modify should modify nothing if typeof state is boolean', () => {
		const count = defineModel({
			name: 'count',
			state: true,
			reducers: {},
			actions: {
				makeCall(modifier: (state: any) => void): void {
					this.$modify(modifier)
				},
			},
		})

		const store = manager.get(count)
		const originalValue = store.$state()

		const modifier = (state: any) => {
			state = false
			return false
		}
		store.makeCall(modifier)
		expect(originalValue).toEqual(store.$state())
	})

	test('this should contain $dep', async () => {
		let dep: any

		const count = defineModel({
			name: 'count',
			state: { count: 0 },
			reducers: {
				add: (s, p: number) => ({
					count: s.count + p,
				}),
			},
			actions: {
				makeCall0(_: number): void {},
			},
		})

		const count0 = defineModel(
			{
				name: 'count0',
				state: { value: 7 },
				reducers: {
					add: (s, p: number) => ({ value: s.value + p }),
				},
				actions: {
					makeCall(_: void): void {
						dep = this.$dep
						this.$dep.count.add(1)
					},
				},
			},
			[count]
		)

		const store = manager.get(count0)

		store.makeCall()
		expect(dep.count.$state()).toEqual({ count: 1 })
		expect(typeof dep.count.makeCall0).toBe('function')
	})

	test('should create an action dynamically', () => {
		const example = defineModel({
			name: 'example',
			state: { value: 0 },
			reducers: {
				addOne: () => ({ value: 1 }),
			},
			actions: {
				add(): void {
					this.addOne()
				},
			},
		})

		const store = manager.get(example)

		store.add()
		expect(store.$state()).toStrictEqual({ value: 1 })
	})

	test('should be able trigger a local reducer by `this`', async () => {
		const example = defineModel({
			name: 'example',
			state: { value: 0 },
			reducers: {
				addOne: (s) => ({ value: s.value + 1 }),
			},
			actions: {
				async asyncAddOne(): Promise<void> {
					await this.addOne()
				},
			},
		})

		const store = manager.get(example)

		await store.asyncAddOne()

		expect(store.$state()).toStrictEqual({ value: 1 })
	})

	test('should be able to trigger local reducer with a value', async () => {
		const example = defineModel({
			name: 'example',
			state: { value: 2 },
			reducers: {
				addBy: (state, payload: number) => ({ value: state.value + payload }),
			},
			actions: {
				async asyncAddBy(value: number): Promise<void> {
					await this.addBy(value)
				},
			},
		})

		const store = manager.get(example)

		await store.asyncAddBy(5)

		expect(store.$state()).toStrictEqual({ value: 7 })
	})

	test('should be able to trigger local reducer an object value', async () => {
		const example = defineModel({
			name: 'example',
			state: { value: 3 },
			reducers: {
				addBy: (state, payload: { value: number }) => ({
					value: state.value + payload.value,
				}),
			},
			actions: {
				async asyncAddBy(payload: { value: number }): Promise<void> {
					await this.addBy(payload)
				},
			},
		})

		const store = manager.get(example)

		await store.asyncAddBy({ value: 6 })

		expect(store.$state()).toStrictEqual({ value: 9 })
	})

	test('should be able to trigger local action by `this`', async () => {
		const example = defineModel({
			name: 'example',
			state: { value: 0 },
			reducers: {
				addOne: (state) => ({ value: state.value + 1 }),
			},
			actions: {
				async asyncAddOne(): Promise<void> {
					await this.addOne()
				},
				async asyncCallAddOne(): Promise<void> {
					await this.asyncAddOne()
				},
			},
		})

		const store = manager.get(example)

		await store.asyncCallAddOne()

		expect(store.$state()).toStrictEqual({ value: 1 })
	})

	test('should be able to trigger multiple reducer and action', async () => {
		const example = defineModel({
			name: 'example',
			state: { value: 0 },
			reducers: {
				addBy: (state, payload: number) => ({ value: state.value + payload }),
			},
			actions: {
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

		await store.asyncAddSome()

		expect(store.$state()).toStrictEqual({ value: 5 })
	})

	test('should be able call a local view by `this`', async () => {
		const example = defineModel({
			name: 'example',
			state: { value: 0 },
			reducers: {},
			actions: {
				async asyncAddOne(): Promise<Number> {
					return await this.valueAddOne()
				},
			},
			views: {
				valueAddOne(args: number = 0) {
					return this.value + 1 + args
				},
			},
		})

		const store = manager.get(example)

		const result = await store.asyncAddOne()

		expect(result).toBe(1)
	})

	test('should be able to call local view with a value', async () => {
		const example = defineModel({
			name: 'example',
			state: { value: 0 },
			reducers: {},
			actions: {
				async asyncAddOne(): Promise<Number> {
					return await this.valueAddOne(1)
				},
			},
			views: {
				valueAddOne(args: number = 0) {
					return this.value + 1 + args
				},
			},
		})

		const store = manager.get(example)

		const result = await store.asyncAddOne()

		expect(result).toBe(2)
	})

	describe('$dep has full function of reducer action views $state() $set() $modify():', () => {
		test("$dep's $state should worked", async () => {
			const depModel = defineModel({
				name: 'depModel',
				state: { value: 0 },
				reducers: {
					add: (s, p: number) => ({
						value: s.value + p,
					}),
				},
			})

			const count = defineModel(
				{
					name: 'count',
					state: { count: 0 },
					reducers: {},
					actions: {
						makeCall() {
							expect(this.$dep.depModel.$state()).toEqual({ value: 0 })
							this.$dep.depModel.add(1)
							expect(this.$dep.depModel.$state()).toEqual({ value: 1 })
						},
					},
				},
				[depModel]
			)

			const store = manager.get(count)

			store.makeCall()
		})

		test("$dep's $set should worked", () => {
			const depModel = defineModel({
				name: 'depModel',
				state: { value: 0 },
				reducers: {},
			})

			const count = defineModel(
				{
					name: 'count',
					state: { count: 0 },
					reducers: {},
					actions: {
						makeCall() {
							const newState = { value: 1 }
							this.$dep.depModel.$set(newState)
							expect(this.$dep.depModel.$state()).toEqual(newState)
							const newState2 = { value: 2 }
							this.$dep.depModel.$set(newState2)
							expect(this.$dep.depModel.$state()).toEqual(newState2)
						},
					},
				},
				[depModel]
			)

			const store = manager.get(count)

			store.makeCall()
		})

		test("$dep's $set should works if argument is primitive value", () => {
			const depModel = defineModel({
				name: 'depModel',
				state: { value: 0 },
				reducers: {},
			})

			const count = defineModel(
				{
					name: 'count',
					state: { count: 0 },
					reducers: {},
					actions: {
						makeCall() {
							this.$dep.depModel.$set([])
							expect(this.$dep.depModel.$state()).toEqual([])
							this.$dep.depModel.$set(1)
							expect(this.$dep.depModel.$state()).toEqual(1)
							this.$dep.depModel.$set(false)
							expect(this.$dep.depModel.$state()).toEqual(false)
							this.$dep.depModel.$set('test string')
							expect(this.$dep.depModel.$state()).toEqual('test string')
						},
					},
				},
				[depModel]
			)

			const store = manager.get(count)

			store.makeCall()
		})

		test("$dep's $modify could change Object state", () => {
			const depModel = defineModel({
				name: 'depModel',
				state: { value: 0 },
				reducers: {},
			})

			const count = defineModel(
				{
					name: 'count',
					state: { count: 0 },
					reducers: {},
					actions: {
						makeCall() {
							this.$dep.depModel.$modify((state) => {
								state.value += 1
							})
							expect(this.$dep.depModel.$state()).toEqual({ value: 1 })
							this.$dep.depModel.$modify((state) => {
								state.value -= 1
							})
							expect(this.$dep.depModel.$state()).toEqual({ value: 0 })
						},
					},
				},
				[depModel]
			)

			const store = manager.get(count)

			store.makeCall()
		})

		test("$dep's $modify could change Array state", () => {
			const depModel = defineModel({
				name: 'depModel',
				state: [0],
				reducers: {},
			})

			const count = defineModel(
				{
					name: 'count',
					state: { count: 0 },
					reducers: {},
					actions: {
						makeCall() {
							this.$dep.depModel.$modify((state) => {
								state.push(1)
							})
							expect(this.$dep.depModel.$state()).toEqual([0, 1])
							this.$dep.depModel.$modify((state) => {
								state.pop()
							})
							expect(this.$dep.depModel.$state()).toEqual([0])
						},
					},
				},
				[depModel]
			)

			const store = manager.get(count)

			store.makeCall()
		})

		test("$dep's $modify does not affected by returned value from the modifier", () => {
			const depModel = defineModel({
				name: 'depModel',
				state: { value: 0 },
				reducers: {},
			})

			const count = defineModel(
				{
					name: 'count',
					state: { count: 0 },
					reducers: {},
					actions: {
						makeCall() {
							this.$dep.depModel.$modify((_) => {
								return {
									value: 100,
								}
							})
							expect(this.$dep.depModel.$state()).not.toEqual({ value: 100 })
							this.$dep.depModel.$modify((_) => {
								return {
									value: -100,
								}
							})
							expect(this.$dep.depModel.$state()).not.toEqual({ value: -100 })

							expect(this.$dep.depModel.$state()).toEqual({ value: 0 })
						},
					},
				},
				[depModel]
			)

			const store = manager.get(count)

			store.makeCall()
		})

		test("$dep's $modify should modify nothing if typeof state is number", () => {
			const depModel = defineModel({
				name: 'depModel',
				state: 0,
			})

			const count = defineModel(
				{
					name: 'count',
					state: { count: 0 },
					actions: {
						makeCall() {
							this.$dep.depModel.$modify((_) => {
								return 100
							})
							expect(this.$dep.depModel.$state()).not.toEqual(100)
							this.$dep.depModel.$modify((_) => {
								return -100
							})
							expect(this.$dep.depModel.$state()).not.toEqual(-100)

							expect(this.$dep.depModel.$state()).toEqual(0)
						},
					},
				},
				[depModel]
			)

			const store = manager.get(count)

			store.makeCall()
		})

		test("$dep's $modify should modify nothing if typeof state is string", () => {
			const depModel = defineModel({
				name: 'depModel',
				state: 'initial',
			})

			const count = defineModel(
				{
					name: 'count',
					state: { count: 0 },
					actions: {
						makeCall() {
							this.$dep.depModel.$modify((_) => {
								return 'test'
							})
							expect(this.$dep.depModel.$state()).not.toEqual('test')
							expect(this.$dep.depModel.$state()).toEqual('initial')
						},
					},
				},
				[depModel]
			)

			const store = manager.get(count)

			store.makeCall()
		})

		test("$dep's $modify should modify nothing if typeof state is boolean", () => {
			const depModel = defineModel({
				name: 'depModel',
				state: false,
			})

			const count = defineModel(
				{
					name: 'count',
					state: { count: 0 },
					actions: {
						makeCall() {
							this.$dep.depModel.$modify((_) => {
								return true
							})
							expect(this.$dep.depModel.$state()).not.toEqual(true)
							expect(this.$dep.depModel.$state()).toEqual(false)
						},
					},
				},
				[depModel]
			)

			const store = manager.get(count)

			store.makeCall()
		})

		test("$dep's reducer should worked", async () => {
			const depModel = defineModel({
				name: 'depModel',
				state: { value: 0 },
				reducers: {
					add: (s, p: number) => ({
						value: s.value + p,
					}),
				},
			})

			const count = defineModel(
				{
					name: 'count',
					state: { count: 0 },
					reducers: {},
					actions: {
						makeCall() {
							expect(this.$dep.depModel.$state()).toEqual({ value: 0 })
							this.$dep.depModel.add(2)
							expect(this.$dep.depModel.$state()).toEqual({ value: 2 })
							this.$dep.depModel.add(2)
							expect(this.$dep.depModel.$state()).toEqual({ value: 4 })
						},
					},
				},
				[depModel]
			)

			const store = manager.get(count)

			store.makeCall()
		})

		test("$dep's action should worked", async () => {
			const depModel = defineModel({
				name: 'depModel',
				state: { value: 0 },
				reducers: {
					add: (s, p: number) => ({
						value: s.value + p,
					}),
				},
				actions: {
					async addAsync() {
						await this.add(1)
						return ''
					},
				},
			})

			const count = defineModel(
				{
					name: 'count',
					state: { count: 0 },
					reducers: {},
					actions: {
						async makeCall() {
							expect(this.$dep.depModel.$state()).toEqual({ value: 0 })
							await this.$dep.depModel.addAsync()
							expect(this.$dep.depModel.$state()).toEqual({ value: 1 })
						},
					},
				},
				[depModel]
			)

			const store = manager.get(count)

			store.makeCall()
		})

		test("$dep's view should worked", async () => {
			const depModel = defineModel({
				name: 'depModel',
				state: { value: 0 },
				reducers: {
					add: (s, p: number) => ({
						value: s.value + p,
					}),
				},
				views: {
					double() {
						return this.value * 2
					},
				},
			})

			const count = defineModel(
				{
					name: 'count',
					state: { count: 0 },
					reducers: {},
					actions: {
						async makeCall() {
							expect(this.$dep.depModel.double()).toBe(0)
							await this.$dep.depModel.add(1)
							expect(this.$dep.depModel.double()).toBe(2)
						},
					},
				},
				[depModel]
			)

			const store = manager.get(count)

			store.makeCall()
		})

		test('multiple $dep should worked', async () => {
			const depModel = defineModel({
				name: 'depModel',
				state: { value: 0 },
				reducers: {
					add: (s, p: number) => ({
						value: s.value + p,
					}),
				},
				views: {
					double() {
						return this.value * 2
					},
				},
			})

			const depModel0 = defineModel({
				name: 'depModel0',
				state: { value: 0 },
				reducers: {
					add: (s, p: number) => ({
						value: s.value + p,
					}),
				},
				actions: {
					async addAsync() {
						await this.add(1)
					},
				},
			})

			const count = defineModel(
				{
					name: 'count',
					state: { count: 0 },
					reducers: {},
					actions: {
						async makeCall() {
							expect(this.$dep.depModel.double()).toBe(0)
							await this.$dep.depModel.add(1)
							expect(this.$dep.depModel.double()).toBe(2)
							expect(this.$dep.depModel0.$state()).toEqual({ value: 0 })
							await this.$dep.depModel0.addAsync()
							expect(this.$dep.depModel0.$state()).toEqual({ value: 1 })
							this.$dep.depModel0.$set({ value: 10 })
							expect(this.$dep.depModel0.$state()).toEqual({ value: 10 })
							this.$dep.depModel0.$modify((state) => {
								state.value -= 10
							})
							expect(this.$dep.depModel0.$state()).toEqual({ value: 0 })
						},
					},
				},
				[depModel0, depModel]
			)

			const store = manager.get(count)

			store.makeCall()
		})

		test('depends order is not important', async () => {
			const depModel = defineModel({
				name: 'depModel',
				state: { value: 0 },
				reducers: {
					add: (s, p: number) => ({
						value: s.value + p,
					}),
				},
				views: {
					double() {
						return this.value * 2
					},
				},
			})

			const depModel0 = defineModel({
				name: 'depModel0',
				state: { value: 0 },
				reducers: {
					add: (s, p: number) => ({
						value: s.value + p,
					}),
				},
				actions: {
					async addAsync() {
						await this.add(1)
					},
				},
			})

			const count = defineModel(
				{
					name: 'count',
					state: { count: 0 },
					reducers: {},
					actions: {
						async makeCall() {
							expect(this.$dep.depModel.double()).toBe(0)
							await this.$dep.depModel.add(1)
							expect(this.$dep.depModel.double()).toBe(2)
							expect(this.$dep.depModel0.$state()).toEqual({ value: 0 })
							await this.$dep.depModel0.addAsync()
							expect(this.$dep.depModel0.$state()).toEqual({ value: 1 })
						},
					},
				},
				[depModel, depModel0]
			)

			const store = manager.get(count)

			store.makeCall()
		})
	})
})
