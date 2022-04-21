import { defineModel, redox } from '../src'
let manager: ReturnType<typeof redox>
beforeEach(() => {
	manager = redox()
})

describe('effects worked:', () => {
	test('should create an action', () => {
		const count = defineModel({
			name: 'count',
			state: { value: 0 },
			reducers: {},
			effects: {
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
			effects: {
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
			effects: {
				setString(arg0, arg1: string) {
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
			effects: {
				setString(arg0, arg1: string, arg2: { three: string }) {
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
			effects: {
				setString(
					arg0,
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
			effects: {
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
			effects: {
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
			effects: {
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
				effects: {
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

	test('should create an effect dynamically', () => {
		const example = defineModel({
			name: 'example',
			state: { value: 0 },
			reducers: {
				addOne: () => ({ value: 1 }),
			},
			effects: {
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
			effects: {
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
			effects: {
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
			effects: {
				async asyncAddBy(payload: { value: number }): Promise<void> {
					await this.addBy(payload)
				},
			},
		})

		const store = manager.get(example)

		await store.asyncAddBy({ value: 6 })

		expect(store.$state()).toStrictEqual({ value: 9 })
	})

	test('should be able to trigger local effect by `this`', async () => {
		const example = defineModel({
			name: 'example',
			state: { value: 0 },
			reducers: {
				addOne: (state) => ({ value: state.value + 1 }),
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

		await store.asyncAddSome()

		expect(store.$state()).toStrictEqual({ value: 5 })
	})

	test('should be able call a local view by `this`', async () => {
		const example = defineModel({
			name: 'example',
			state: { value: 0 },
			reducers: {},
			effects: {
				async asyncAddOne(): Promise<Number> {
					return await this.valueAddOne()
				},
			},
			views: {
				valueAddOne(state, _dependState, args: number = 0) {
					return state.value + 1 + args
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
			effects: {
				async asyncAddOne(): Promise<Number> {
					return await this.valueAddOne(1)
				},
			},
			views: {
				valueAddOne(state, _dependState, args: number = 0) {
					return state.value + 1 + args
				},
			},
		})

		const store = manager.get(example)

		const result = await store.asyncAddOne()

		expect(result).toBe(2)
	})

	describe('$dep has full function of reducer effect views $state():', () => {
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
					effects: {
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
					effects: {
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

		test("$dep's effect should worked", async () => {
			const depModel = defineModel({
				name: 'depModel',
				state: { value: 0 },
				reducers: {
					add: (s, p: number) => ({
						value: s.value + p,
					}),
				},
				effects: {
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
					effects: {
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
					double(state) {
						return state.value * 2
					},
				},
			})

			const count = defineModel(
				{
					name: 'count',
					state: { count: 0 },
					reducers: {},
					effects: {
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
					double(state) {
						return state.value * 2
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
				effects: {
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
					effects: {
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
					double(state) {
						return state.value * 2
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
				effects: {
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
					effects: {
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
