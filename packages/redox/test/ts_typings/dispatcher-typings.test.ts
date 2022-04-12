import { defineModel, redox } from '../../src'
let manager: ReturnType<typeof redox>
describe('Dispatcher typings', () => {
	manager = redox()
	describe("shouldn't throw error accessing reducers with", () => {
		beforeEach(() => {
			manager = redox()
		})
		it('required payload', () => {
			const model = defineModel({
				name: 'model',
				state: {
					value: 0,
				},
				reducers: {
					inc(state, payload: number) {
						return {
							value: state.value + payload,
						}
					},
				},
			})

			const store = manager.get(model)

			const { dispatch } = store
			dispatch.inc(1)
		})

		it('custom types', () => {

			type Themes = 'light' | 'dark'
			const myModel = defineModel({
				name: 'myModel',
				state: {
					value: 'light',
				},
				reducers: {
					inc(_state, payload: Themes) {
						return {
							value: payload,
						}
					},
				},
			})

			const store = manager.get(myModel)

			const { dispatch } = store
			dispatch.inc('light')
			dispatch.inc('dark')
		})

		it('with union types', () => {
			const myModel = defineModel({
				name: 'myModel',
				state: {
					value: 'light',
				},
				reducers: {
					inc(_state, payload: 'light' | 'dark') {
						return {
							value: payload,
						}
					},
				},
			})

			const store = manager.get(myModel)

			const { dispatch } = store

			dispatch.inc('light')
			dispatch.inc('dark')
		})

		it('optional payload', () => {
			const myModel = defineModel({
				name: 'myModel',
				state: {
					value: 0,
				},
				reducers: {
					inc(state, payload?: number) {
						return {
							value: state.value + (payload || 0),
						}
					},
				},
			})

			const store = manager.get(myModel)
			const { dispatch } = store

			dispatch.inc(1)
			dispatch.inc()
		})

		it('optional payload with default value when nil', () => {
			const myModel = defineModel({
				name: 'myModel',
				state: {
					value: 0,
				},
				reducers: {
					// eslint-disable-next-line @typescript-eslint/no-inferrable-types
					inc(state, payload: number = 3) {
						return {
							value: state.value + payload,
						}
					},
				},
			})

			const store = manager.get(myModel)
			const { dispatch } = store
			dispatch.inc(4)
			dispatch.inc()
		})

		it('payload defined as any type', () => {
			const myModel = defineModel({
				name: 'myModel',
				state: {
					value: 0,
				},
				reducers: {
					inc(state, payload?: any) {
						return {
							value: state.value + (payload || 0),
						}
					},
				},
			})
			const store = manager.get(myModel)
			const { dispatch } = store
			dispatch.inc(4)
			dispatch.inc('4')
			dispatch.inc()
		})

		it('optional payload defined as any type', () => {
			const myModel = defineModel({
				name: 'myModel',
				state: {
					value: 0,
				},
				reducers: {
					inc(state, payload?: any) {
						return {
							value: state.value + (payload || 0),
						}
					},
				},
			})
			const store = manager.get(myModel)
			const { dispatch } = store
			dispatch.inc(4)
			dispatch.inc('4')
			dispatch.inc()
		})

		it('required payload but maybe undefined', () => {
			const myModel = defineModel({
				name: 'myModel',
				state: {
					value: 0,
				},
				reducers: {
					inc(state, payload: number | undefined) {
						return {
							value: state.value + (payload || 1),
						}
					},
				},
			})

			const store = manager.get(myModel)
			const { dispatch } = store
			dispatch.inc(4)
			dispatch.inc(undefined)
		})

		it('payload and meta', () => {
			const myModel = defineModel({
				name: 'myModel',
				state: {
					value: 0,
				},
				reducers: {
					incWithRequiredMeta(state, payload: number) {
						return {
							value: state.value + (payload || 1),
						}
					},
					incWithOptionalMeta(state, payload: number) {
						return {
							value: state.value + (payload || 1),
						}
					},
					incWithOptionalMetaAndOptionalPayload(state, payload?: number) {
						return {
							value: state.value + (payload || 1),
						}
					},
				},
			})

			const store = manager.get(myModel)

			const { dispatch } = store

			dispatch.incWithOptionalMeta(4)

			dispatch.incWithOptionalMetaAndOptionalPayload()
			dispatch.incWithOptionalMetaAndOptionalPayload(4)
		})

		it('reducer without arguments', () => {
			const myModel = defineModel({
				name: 'myModel',
				state: {
					value: 0,
				},
				reducers: {
					inc(state) {
						return state
					},
				},
			})

			const store = manager.get(myModel)
			const { dispatch } = store
			dispatch.inc()
		})
	})

	describe("shouldn't throw error accessing effects with", () => {
		beforeEach(() => {
			manager = redox()
		})
		it('required payload', () => {
			const count = defineModel({
				name: 'count',
				state: {
					value: 0,
				}, // initial state
				reducers: {},
				effects: {
					incrementEffect(payload: number) {
						return payload
					},
					incWithPayloadMaybeUndefined(payload: number | undefined) {
						return payload
					},
				},
			})

			const store = manager.get(count)
			const { dispatch } = store
			dispatch.incWithPayloadMaybeUndefined(undefined)
			dispatch.incrementEffect(2)
			dispatch.incrementEffect(2)
		})

		it('optional payload', () => {
			const count = defineModel({
				name: 'count',
				state: { value: 0 }, // initial state
				reducers: {},
				effects: {
					incrementEffect(payload?: number) {
						return payload
					},
				},
			})

			const store = manager.get(count)
			const { dispatch } = store

			dispatch.incrementEffect(2)
			dispatch.incrementEffect()

			// dispatch.incrementEffect('test')
		})

		it('required payload and accessing rootState', () => {
			const count = defineModel({
				name: 'count',
				state: { value: 0 }, // initial state
				reducers: {},
				effects: {
					incrementEffect(payload: number, rootState) {
						if (rootState) {
							// do nothing
						}
						return payload
					},
				},
			})

			const store = manager.get(count)
			const { dispatch } = store

			dispatch.incrementEffect(2)
		})

		it('optional payload and accessing state', () => {
			const count = defineModel({
				name: 'count',
				state: { value: 0 }, // initial state
				reducers: {},
				effects: {
					incrementEffect(payload?: number, rootState?): number | undefined {
						if (rootState) {
							// do nothing
						}
						return payload
					},
				},
			})

			const store = manager.get(count)

			const { dispatch } = store

			dispatch.incrementEffect(2)
			dispatch.incrementEffect()
		})

		it('optional payload and accessing store', () => {
			const count = defineModel({
				name: 'count',
				state: { value: 0 }, // initial state
				reducers: {},
				effects: {
					incrementEffect(
						payload?: number,
						_state?,
						store?
					): number | undefined {
						if (store.getState()) {
							// do nothing
						}
						return payload
					},
				},
			})

			const store = manager.get(count)
			const { dispatch } = store

			dispatch.incrementEffect(2)
			dispatch.incrementEffect()
		})

		it('payload and meta', () => {
			const myModel = defineModel({
				name: 'myModel',
				state: { value: 0 },
				reducers: {},
				effects: {
					incWithRequiredMeta(_payload: number, _state, _rootState) {},
					incWithOptionalMeta(_payload: number, _state, _rootState) {},
					incWithOptionalMetaAndOptionalPayload(
						_payload?: number,
						_state?,
						_rootState?
					) {},
					incWithMetaMaybeUndefined(_payload: number, _state, _rootState) {},
				},
			})

			const store = manager.get(myModel)

			const { dispatch } = store

			dispatch.incWithOptionalMeta(4)

			dispatch.incWithOptionalMetaAndOptionalPayload()
			dispatch.incWithOptionalMetaAndOptionalPayload(4)
		})

		it('without any parameter', () => {
			const myModel = defineModel({
				name: 'myModel',
				state: { value: 0 },
				reducers: {},
				effects: {
					withoutArgs() {},
				},
			})

			const store = manager.get(myModel)

			const { dispatch } = store

			dispatch.withoutArgs()
		})
	})

	describe('should throw error while accessing non-existent reducer/effects', () => {
		manager = redox()
		const count = defineModel({
			name: 'count',
			state: { value: 0 },
			reducers: {
				increment(state, payload: number) {
					return {
						value: state.value + (payload || 0),
					}
				},
			},
			effects: {
				decrement(_: number, _state) {},
			},
		})

		try {
			const store = manager.get(count)
			// @ts-ignore
			store.dispatch.foo()
		} catch (error: any) {
			// catch because .foo() doesn't exist
		}
	})

	describe('dispatch to an effect with the same name of the reducer', () => {
		manager = redox()
		const count = defineModel({
			name: 'count',
			state: { value: 0 },
			reducers: {
				incrementReducer(state, payload: number) {
					return {
						value: state.value + (payload || 0),
					}
				},
				decrement(state, payload: number) {
					return {
						value: state.value - (payload || 0),
					}
				},
			},
			effects: {
				increment(_: number, state) {
					if (state.value < 5) {
						this.incrementReducer(1)
					}
				},
			},
		})

		const store = manager.get(count)
		store.dispatch.increment(1)
		store.dispatch.increment(10)
		store.dispatch.decrement(3)
	})
})
