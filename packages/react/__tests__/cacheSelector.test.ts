import { defineModel, redox } from '@shuvi/redox'
import { isProxy } from '@shuvi/redox/views'
import { getStateActions } from '../src/getStateActions'
import { cacheSelector } from '../src/cacheSelector'
import { ISelectorParams } from '../src/types'

let manager: ReturnType<typeof redox>
beforeEach(() => {
	manager = redox()
})

describe('cacheSelector', () => {
	it('should throw error if changed state in a view', () => {
		const model = defineModel({
			name: 'model',
			state: {
				a: 1,
			},
			views: {
				view() {
					const state = this.$state()
					state.a = 1
					return this.$state()
				},
			},
		})

		expect(() => {
			getStateActions(
				model,
				manager,
				cacheSelector(function (stateAndViews) {
					stateAndViews.a = 1
					return 1
				})
			)
		}).toThrow()
	})

	it('should return same reference if no update', () => {
		const sample = defineModel({
			name: 'sample',
			state: {
				a: { foo: 'bar' },
				b: 1,
			},
			reducers: {
				changeB(state) {
					return {
						...state,
						b: state.b + 1,
					}
				},
			},
			views: {
				viewA() {
					void this.a
					return {}
				},
			},
		})

		const selector = cacheSelector(function (
			stateAndViews: ISelectorParams<typeof sample>
		) {
			return stateAndViews.viewA()
		})

		const [value] = getStateActions(sample, manager, selector)
		const store = manager.get(sample)
		store.changeB()

		expect(getStateActions(sample, manager, selector)[0]).toBe(value)
	})

	test("should not be invoked when deps don't change (this.$state())", () => {
		let calltime = 0
		const model = defineModel({
			name: 'model',
			state: {
				foo: 'bar',
			},
			reducers: {
				changeValue: (state) => {
					state.foo = 'zoo'
				},
			},
		})

		const selector = cacheSelector(function (
			stateAndViews: ISelectorParams<typeof model>
		) {
			calltime++
			return stateAndViews.$state().foo
		})

		let value: string

		expect(calltime).toBe(0)
		value = getStateActions(model, manager, selector)[0]
		value = getStateActions(model, manager, selector)[0]
		expect(calltime).toBe(1)
		expect(value).toEqual('bar')

		const store = manager.get(model)
		store.changeValue()
		value = getStateActions(model, manager, selector)[0]
		expect(calltime).toBe(2)
		expect(value).toEqual('zoo')
	})

	test("should not be invoked when deps don't change (view)", () => {
		let calltime = 0
		const model = defineModel({
			name: 'model',
			state: {
				foo: 'bar',
			},
			reducers: {
				changeValue: (state) => {
					state.foo = 'zoo'
				},
			},
			views: {
				getFoo() {
					return this.foo
				},
			},
		})

		const selector = cacheSelector(function (
			stateAndViews: ISelectorParams<typeof model>
		) {
			calltime++
			return stateAndViews.getFoo()
		})

		let value: string

		expect(calltime).toBe(0)
		value = getStateActions(model, manager, selector)[0]
		value = getStateActions(model, manager, selector)[0]
		expect(calltime).toBe(1)
		expect(value).toEqual('bar')

		const store = manager.get(model)
		store.changeValue()
		value = getStateActions(model, manager, selector)[0]
		expect(calltime).toBe(2)
		expect(value).toEqual('zoo')
	})

	describe('primitive state/simple value', () => {
		it("should not be invoked when deps don't change", () => {
			let numberOfCalls = 0
			const numberModel = defineModel({
				name: 'numberModel',
				state: 0,
				reducers: {
					doNothing: (_) => {},
				},
			})

			const selector = cacheSelector(function (
				stateAndViews: ISelectorParams<typeof numberModel>
			) {
				numberOfCalls++
				return stateAndViews.$state()
			})

			const numberStore = manager.get(numberModel)

			let valueFromViews

			expect(numberOfCalls).toBe(0)
			valueFromViews = getStateActions(numberModel, manager, selector)[0]
			expect(numberOfCalls).toBe(1)
			expect(valueFromViews).toBe(0)

			numberStore.doNothing()
			valueFromViews = getStateActions(numberModel, manager, selector)[0]
			expect(numberOfCalls).toBe(1)
			expect(valueFromViews).toBe(0)
		})

		it('should return last value', () => {
			let numberOfCalls = 0
			const numberModel = defineModel({
				name: 'numberModel',
				state: 0,
				reducers: {
					increment: (state) => {
						return ++state
					},
				},
			})

			const selector = cacheSelector(function (
				stateAndViews: ISelectorParams<typeof numberModel>
			) {
				numberOfCalls++
				return stateAndViews.$state()
			})

			const numberStore = manager.get(numberModel)

			let valueFromViews

			expect(numberOfCalls).toBe(0)
			valueFromViews = getStateActions(numberModel, manager, selector)[0]
			expect(numberOfCalls).toBe(1)
			expect(valueFromViews).toBe(0)

			numberStore.increment()
			valueFromViews = getStateActions(numberModel, manager, selector)[0]
			expect(numberOfCalls).toBe(2)
			expect(valueFromViews).toBe(1)
		})
	})

	describe('primitive state/array', () => {
		it("should not be invoked when deps don't change", () => {
			let numberOfCalls = 0

			const arrayModel = defineModel({
				name: 'arrayModel',
				state: [0, 1],
				reducers: {
					doNothing: (state) => {
						return state
					},
				},
			})

			const selector = cacheSelector(function (
				stateAndViews: ISelectorParams<typeof arrayModel>
			) {
				numberOfCalls++
				return stateAndViews.$state()[0]
			})

			const arrayStore = manager.get(arrayModel)

			let valueFromViews

			expect(numberOfCalls).toBe(0)
			valueFromViews = getStateActions(arrayModel, manager, selector)[0]
			expect(numberOfCalls).toBe(1)
			expect(valueFromViews).toEqual(0)

			arrayStore.doNothing()
			valueFromViews = getStateActions(arrayModel, manager, selector)[0]
			expect(numberOfCalls).toBe(1)
			expect(valueFromViews).toEqual(0)
		})

		it('should return last value', () => {
			let numberOfCalls = 0

			const arrayModel = defineModel({
				name: 'arrayModel',
				state: [0],
				reducers: {
					remove: (state, payload: number) => {
						state.splice(payload, 1)
						return state
					},
					append: (state, payload: any) => {
						state.push(payload)
						return state
					},
				},
			})

			const selector = cacheSelector(function (
				stateAndViews: ISelectorParams<typeof arrayModel>
			) {
				numberOfCalls++
				return stateAndViews.$state()
			})

			const arrayStore = manager.get(arrayModel)

			let valueFromViews

			expect(numberOfCalls).toBe(0)
			valueFromViews = getStateActions(arrayModel, manager, selector)[0]
			expect(numberOfCalls).toBe(1)
			expect(valueFromViews).toEqual([0])

			arrayStore.append(1)
			valueFromViews = getStateActions(arrayModel, manager, selector)[0]
			expect(numberOfCalls).toBe(2)
			expect(valueFromViews).toEqual([0, 1])
		})
	})

	describe('should not return proxy data', () => {
		function isProxyObj(obj: any) {
			if (!obj || typeof obj !== 'object') {
				return false
			}
			// is a proxy obj
			if (obj[isProxy]) {
				return true
			}
			const keys = Object.keys(obj)
			// value maybe proxy
			for (let i = 0; i < keys.length; i++) {
				const key = keys[i]
				if (isProxyObj(obj[key])) {
					return true
				}
			}
			return false
		}

		it('return part state direct', () => {
			const deepObjModel = defineModel({
				name: 'deepObj',
				state: {
					a: {
						b: {
							c: 'c',
						},
					},
				},
				reducers: {},
			})

			const selector = cacheSelector(function (
				stateAndViews: ISelectorParams<typeof deepObjModel>
			) {
				return stateAndViews.a.b
			})

			const b = getStateActions(deepObjModel, manager, selector)[0]

			expect(isProxyObj(b)).toBeFalsy()
		})

		it('state is part of result', () => {
			const deepObjModel = defineModel({
				name: 'deepObj',
				state: {
					a: {
						b: {
							c: 'c',
						},
					},
				},
				reducers: {},
				views: {
					getNewObj() {
						return {
							newB: this.a.b,
							newC: {
								newC: this.a.b.c,
							},
						}
					},
				},
			})

			const selector = cacheSelector(function (
				stateAndViews: ISelectorParams<typeof deepObjModel>
			) {
				return {
					newB: stateAndViews.a.b,
					newC: {
						newC: stateAndViews.a.b.c,
					},
				}
			})

			const newObj = getStateActions(deepObjModel, manager, selector)[0]

			expect(isProxyObj(newObj)).toBeFalsy()
		})
	})
})
