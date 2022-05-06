import { defineModel, redox } from '../src'
let manager: ReturnType<typeof redox>
type customType = 'custom0' | 'custom1' | 'custom'
describe('typings', () => {
	describe('return store type test', () => {
		beforeEach(() => {
			manager = redox()
		})

		test('$state typescript', () => {
			const model = defineModel({
				name: 'model',
				state: {
					value: 0,
				},
				reducers: {},
			})

			const store = manager.get(model)

			const state = store.$state()
			expect(state).toEqual({ value: 0 })
		})

		test('reducers get custom $state typescript', () => {
			const model = defineModel({
				name: 'model',
				state: {
					value: [] as customType[],
				},
				reducers: {
					a(state) {
						return state
					},
				},
			})

			const store = manager.get(model)

			const state = store.$state()
			expect(state).toEqual({ value: [] })
		})

		test('reducers typescript', () => {
			const model = defineModel({
				name: 'model',
				state: {
					value: 0,
				},
				reducers: {
					none() {
						return {
							value: 1,
						}
					},
					one(state) {
						return {
							value: state.value + 1,
						}
					},
					two(state, payload: number) {
						return {
							value: state.value + payload,
						}
					},
					custom(state, _payload: customType) {
						return state
					},
					twoOptional(state, payload: number = 1) {
						return {
							value: state.value + payload,
						}
					},
					twoAny(state, payload) {
						return {
							value: state.value + payload,
						}
					},
					// no allow three params or more
					// more(state, payload: number, other: string) {
					// 	return {
					// 		value: state.value + payload,
					// 	}
					// }
				},
			})

			const store = manager.get(model)
			store.none()
			store.one()
			store.two(1)
			store.custom('custom')
			store.custom('custom0')
			store.custom('custom1')
			store.twoOptional()
			store.twoOptional(2)
			store.twoAny({})
			store.twoAny(1)
			store.twoAny('1')
			store.twoAny([])
		})

		test('effects typescript', () => {
			const model = defineModel({
				name: 'model',
				state: {},
				reducers: {},
				effects: {
					none() {
						return 'none' as const
					},
					one(state: string) {
						console.log('state: ', state)
						return 'one' as const
					},
					argsOptional(args?: string) {
						console.log('args: ', args)
						return 'argsOptional' as const
					},
					argsCustom(args: customType) {
						console.log('args: ', args)
						return 'argsCustom' as const
					},
					more(
						args0: string,
						args1: number,
						_args2: customType,
						depends?: any
					) {
						console.log('args: ', args0, args1)
						console.log('dependsState: ', depends)
						return 'more' as const
					},
					argsAny(args: any, depends: any) {
						console.log('args: ', args)
						console.log('dependsState: ', depends)
						return 'argsAny' as const
					},
				},
			})

			const store = manager.get(model)
			store.none()
			store.one('')
			store.more('', 1, 'custom')
			store.argsOptional()
			store.argsOptional('')
			store.argsCustom('custom')
			store.argsCustom('custom0')
			store.argsCustom('custom1')
			store.argsAny({}, 1)
			store.argsAny(1, {})
			store.argsAny('1', 1)
			store.argsAny([], {})
		})

		test('effects return async typescript', () => {
			const model = defineModel({
				name: 'model',
				state: {},
				reducers: {},
				effects: {
					async none() {
						return 'none' as const
					},
					async one(state: string) {
						console.log('state: ', state)
						return 'one' as const
					},
					async argsOptional(args?: string) {
						console.log('args: ', args)
						return 'argsOptional' as const
					},
					async argsCustom(args: customType) {
						console.log('args: ', args)
						return 'argsCustom' as const
					},
					async more(
						args0: string,
						args1: number,
						_args2: customType,
						depends?: any
					) {
						console.log('args: ', args0, args1)
						console.log('dependsState: ', depends)
						return 'more' as const
					},
					async argsAny(args: any, depends: any) {
						console.log('args: ', args)
						console.log('dependsState: ', depends)
						return 'argsAny' as const
					},
				},
			})

			const store = manager.get(model)
			const none = store.none()
			console.log('none: ', none)
			const one = store.one('')
			console.log('one: ', one)
			const more = store.more('', 1, 'custom')
			console.log('more: ', more)
			const argsOptional = store.argsOptional()
			console.log('argsOptional: ', argsOptional)
			const argsCustom = store.argsCustom('custom')
			console.log('argsCustom: ', argsCustom)
			const argsAny = store.argsAny({}, 1)
			console.log('argsAny: ', argsAny)
		})

		test('views typescript', () => {
			const model = defineModel({
				name: 'model',
				state: {},
				reducers: {},
				views: {
					none() {
						return 'none' as const
					},
					argsOptional(args?: string) {
						console.log('args: ', args)
						return 'argsOptional' as const
					},
					argsCustom(args: customType) {
						console.log('args: ', args)
						return 'argsCustom' as const
					},
					argsAny(args: any) {
						console.log('args: ', args)
						return 'argsAny' as const
					},
					argsMore(arg0: string, arg1: customType) {
						console.log('arg0: ', arg0)
						console.log('arg1: ', arg1)
						return 'argsMore' as const
					},
				},
			})

			const store = manager.get(model)
			store.none()
			store.argsOptional()
			store.argsOptional('')
			store.argsCustom('custom')
			store.argsCustom('custom0')
			store.argsCustom('custom1')
			// store.argsAny()
			store.argsAny({})
			store.argsAny(1)
			store.argsAny('1')
			store.argsAny([])
			store.argsMore('1', 'custom')
		})

		test('no reducers effects views typescript', () => {
			const model = defineModel({
				name: 'model',
				state: {
					value: 0,
				},
				reducers: {},
			})

			const store = manager.get(model)

			store.$state()

			// store.a
		})
	})
	describe('defineModel type test', () => {
		beforeEach(() => {
			manager = redox()
		})

		test('reducers get custom $state typescript in function', () => {
			const _model = defineModel({
				name: 'model',
				state: {
					value: [] as customType[],
				},
				reducers: {
					a(state) {
						return state
					},
				},
			})
			console.log('_model: ', _model)
		})

		test('effects this typescript $state', () => {
			const model = defineModel({
				name: 'model',
				state: {
					value: [] as customType[],
				},
				reducers: {},
				effects: {
					none() {
						return this.$state()
					},
				},
			})
			console.log('model: ', model)
		})

		test('effects this typescript with reducers, call reducers', () => {
			const model = defineModel({
				name: 'model',
				state: { value: 0 },
				reducers: {
					none() {
						return {
							value: 1,
						}
					},
					one(state) {
						return {
							value: state.value + 1,
						}
					},
					two(state, payload: number) {
						return {
							value: state.value + payload,
						}
					},
					custom(state, _payload: customType) {
						return state
					},
					twoOptional(state, payload: number = 1) {
						return {
							value: state.value + payload,
						}
					},
					twoAny(state, payload) {
						return {
							value: state.value + payload,
						}
					},
					// no allow three params or more
					// more(state, payload: number, other: string) {
					// 	return {
					// 		value: state.value + payload,
					// 	}
					// }
				},
				effects: {
					anyEffect() {
						this.none()
						this.one()
						this.two(1)
						this.custom('custom')
						this.custom('custom0')
						this.custom('custom1')
						this.twoOptional()
						this.twoOptional(2)
						this.twoAny({})
						this.twoAny(1)
						this.twoAny('1')
						this.twoAny([])
						return 'none' as const
					},
				},
			})
			console.log('model: ', model)
		})

		test('effects this typescript with effects, call self', () => {
			const model = defineModel({
				name: 'model',
				state: { value: 0 },
				reducers: {},
				effects: {
					async none() {
						const none = await this.none()
						const one = await this.one('')
						const more = await this.more('', 1, 'custom')
						const argsOptional = await this.argsOptional()
						const argsCustom = await this.argsCustom('custom')
						const argsAny = await this.argsAny({}, 1)
						return await this.stateType()
					},
					async stateType() {
						return this.$state().value
					},
					async one(args: string) {
						console.log('state: ', args)
						return 'one' as const
					},
					async argsOptional(args?: string) {
						console.log('args: ', args)
						return 'argsOptional' as const
					},
					async argsCustom(args: customType) {
						console.log('args: ', args)
						return 'argsCustom' as const
					},
					async more(
						args0: string,
						args1: number,
						_args2: customType,
						depends?: any
					) {
						console.log('args: ', args0, args1)
						console.log('dependsState: ', depends)
						return 'more' as const
					},
					async argsAny(args: any, depends: any) {
						console.log('args: ', args)
						console.log('dependsState: ', depends)
						return 'argsAny' as const
					},
				},
			})
			const store = manager.get(model)
			const temp = store.stateType()
		})

		test('effects this typescript with effects, call views', () => {
			const model = defineModel({
				name: 'model',
				state: { value: 0 },
				reducers: {},
				effects: {
					async anyOne() {
						this.none()
						this.argsOptional()
						this.argsOptional('')
						this.argsCustom('custom')
						this.argsCustom('custom0')
						this.argsCustom('custom1')
						this.argsAny({})
						this.argsAny(1)
						this.argsAny('1')
						this.argsAny([])
						this.argsMore('1', 'custom')
						return 'none' as const
					},
				},
				views: {
					none() {
						return 'none' as const
					},
					argsOptional(args?: string) {
						console.log('args: ', args)
						return 'argsOptional' as const
					},
					argsCustom(args: customType) {
						console.log('args: ', args)
						return 'argsCustom' as const
					},
					argsAny(args: any) {
						console.log('args: ', args)
						return 'argsAny' as const
					},
					argsMore(arg0: string, arg1: customType) {
						console.log('arg0: ', arg0)
						console.log('arg1: ', arg1)
						return 'argsMore' as const
					},
				},
			})
			console.log('model: ', model)
		})

		test('effects this typescript no depends', () => {
			const model = defineModel({
				name: 'model',
				state: {
					value: [] as customType[],
				},
				reducers: {},
				effects: {
					none() {
						this.$dep
						// this.$dep.a
						return 'none' as const
					},
				},
			})
			console.log('model: ', model)
		})

		const depend0 = defineModel({
			name: 'depend0',
			state: {
				value: [] as string[],
			},
			reducers: {
				depend0Reducer(state, payload: string = '1') {
					state.value.push(payload)
				},
			},
			effects: {
				async depend0Effect(arg0: string) {
					return arg0
				},
			},
			views: {
				depend0View() {
					return this.value[0]
				},
			},
		})

		const depend1 = defineModel({
			name: 'depend1',
			state: {
				value: [] as number[],
			},
			reducers: {
				depend1Reducer(state, payload: number) {
					state.value.push(payload)
				},
			},
			effects: {
				async depend1Effect(arg0: number) {
					return arg0
				},
			},
			views: {
				depend1View() {
					return this.value[0]
				},
			},
		})

		test('effects this typescript with depends', () => {
			const model = defineModel(
				{
					name: 'model',
					state: {
						value: [] as customType[],
					},
					reducers: {},
					effects: {
						async none() {
							this.$dep.depend0.$state()
							this.$dep.depend0.depend0Reducer()
							this.$dep.depend0.depend0Effect('')
							this.$dep.depend0.depend0View()
							this.$dep.depend1.$state()
							this.$dep.depend1.depend1Reducer(1)
							this.$dep.depend1.depend1Effect(1)
							this.$dep.depend1.depend1View()
							return await this.$dep.depend0.depend0Effect('')
						},
					},
				},
				[depend0, depend1]
			)
			const store = manager.get(model)
			const temp = store.none()
		})

		test('views this typescript in function, call self', () => {
			const model = defineModel({
				name: 'model',
				state: { value: 0 },
				reducers: {},
				views: {
					none() {
						this.none
						this.argsOptional
						this.argsCustom
						this.argsAny
						this.argsMore
						return this.value
					},
					argsOptional(args?: string) {
						console.log('args: ', args)
						return 'argsOptional' as const
					},
					argsCustom(args: customType) {
						console.log('args: ', args)
						return 'argsCustom' as const
					},
					argsAny(args: any) {
						console.log('args: ', args)
						return 'argsAny' as const
					},
					argsMore(arg0: string, arg1: customType) {
						console.log('arg0: ', arg0)
						console.log('arg1: ', arg1)
						return 'argsAny' as const
					},
				},
			})
			const store = manager.get(model)
			const temp = store.none()
		})

		test('views typescript no depends', () => {
			const model = defineModel({
				name: 'model',
				state: {},
				reducers: {},
				views: {
					none() {
						return 'none' as const
					},
				},
			})
		})

		test('views typescript with depends', () => {
			const model = defineModel(
				{
					name: 'model',
					state: {},
					reducers: {},
					views: {
						none() {
							const depend0Value = this.$dep.depend0.value[0]
							const depend1Value = this.$dep.depend1.value[0]
							const depend0View = this.$dep.depend0.depend0View()
							const depend1View = this.$dep.depend1.depend1View()
							return depend1View
						},
					},
				},
				[depend0, depend1]
			)
			const store = manager.get(model)
			const temp = store.none()
		})
	})
})
