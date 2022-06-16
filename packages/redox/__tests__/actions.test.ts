import { defineModel, redox } from '../src'

let manager: ReturnType<typeof redox>

const oldEnv = process.env.NODE_ENV
beforeAll(() => {
	process.env.NODE_ENV = 'development'
})
afterAll(() => {
	process.env.NODE_ENV = oldEnv
})

beforeEach(() => {
	manager = redox()
})

describe('defineModel/actions', () => {
	it('should access reducer', () => {
		const count = defineModel({
			name: 'count',
			state: { value: 0 },
			reducers: {
				plusOne: (state) => ({
					value: state.value + 1,
				}),
			},
			actions: {
				add() {
					this.plusOne()
				},
			},
		})

		const store = manager.get(count)

		expect(typeof store.add).toBe('function')

		store.add()
		expect(store.$state()).toEqual({ value: 1 })
	})

	it('should accept params', () => {
		const model = defineModel({
			name: 'model',
			state: { values: [] } as any,
			reducers: {
				setValues(_state, values: any[]) {
					return {
						values: values,
					}
				},
			},
			actions: {
				set(...values: any[]) {
					this.setValues(values)
				},
			},
		})

		const store = manager.get(model)

		store.set(1)
		expect(store.$state().values).toEqual([1])

		store.set(1, 2)
		expect(store.$state().values).toEqual([1, 2])
	})

	it('should return value', () => {
		const model = defineModel({
			name: 'model',
			state: { values: null },
			actions: {
				set() {
					return 'result'
				},
			},
		})

		const store = manager.get(model)
		expect(store.set()).toBe('result')
	})

	it('should support async actions', async () => {
		const example = defineModel({
			name: 'example',
			state: { value: 0 },
			reducers: {
				addBy: (state, payload: number) => ({ value: state.value + payload }),
			},
			actions: {
				async asyncAddOne(): Promise<void> {
					await new Promise<void>((resolve) => {
						setTimeout(() => {
							resolve()
						}, 1000)
					})
					await this.addBy(1)
				},
			},
		})

		const store = manager.get(example)

		const action = store.asyncAddOne()
		expect(store.$state().value).toBe(0)
		await action
		expect(store.$state().value).toBe(1)
	})

	describe('this.$state()', () => {
		it('should work', () => {
			const model = defineModel({
				name: 'model',
				state: { value: 1 },
				reducers: {
					set: (_s, p: number) => ({ value: p }),
				},
				actions: {
					add(n: number) {
						this.set(this.$state().value + n)
					},
				},
			})

			const store = manager.get(model)

			store.add(9)

			expect(store.$state().value).toBe(10)
		})

		it('should always return the newest state', async () => {
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
	})

	describe('this.$set()', () => {
		it('should replace the state', () => {
			const count = defineModel({
				name: 'count',
				state: { a: 1, b: 1 },
				reducers: {},
				actions: {
					set(newState: any): void {
						this.$set(newState)
					},
				},
			})

			const store = manager.get(count)

			store.set({ a: 2 })
			expect(store.$state()).toEqual({ a: 2 })

			store.set({ b: 2 })
			expect(store.$state()).toEqual({ b: 2 })
		})

		it('should not accept Symbol and BigInt', () => {
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

			expect(() => store.$set(Symbol('foo') as any)).toThrow()
			expect(() => store.$set(BigInt(1111) as any)).toThrow()
		})
	})

	describe('this.$modify()', () => {
		it('should change the Object state', () => {
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

		it('should change the Array state', () => {
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

		it('should ignore return value', () => {
			const count = defineModel({
				name: 'count',
				state: { value: 0 },
				reducers: {},
				actions: {
					update(n: number): void {
						this.$modify((state) => {
							state.value = n
							return {
								value: n + 1,
							}
						})
					},
				},
			})

			const store = manager.get(count)
			store.update(1)
			expect(store.$state().value).toEqual(1)
		})

		it('should do nothing if state is number, string or boolean', () => {
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
			const originalNumber = store.$state()

			const addedValue: number = 2
			const modifier = (state: any) => {
				state += addedValue
				return state + addedValue
			}
			store.makeCall(modifier)
			expect(originalNumber).toEqual(store.$state())

			store.$set('test')
			const originalString = store.$state()

			const stringModifier = (state: any) => {
				return state + 'modify'
			}
			store.makeCall(stringModifier)
			expect(originalString).toEqual(store.$state())

			store.$set(false)
			const originalBoolean = store.$state()

			const booleanModifier = (state: any) => {
				return !state
			}
			store.makeCall(booleanModifier)
			expect(originalBoolean).toEqual(store.$state())
		})
	})

	it('should access views by `this`', async () => {
		const example = defineModel({
			name: 'example',
			state: { value: 0 },
			actions: {
				addOne() {
					this.$set({
						value: this.valuePlusN(1),
					})
				},
			},
			views: {
				valuePlusN(n: number) {
					return this.value + n
				},
			},
		})

		const store = manager.get(example)

		store.addOne()
		expect(store.$state().value).toBe(1)
	})
})
