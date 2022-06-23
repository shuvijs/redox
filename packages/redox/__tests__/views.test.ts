import { defineModel, redox } from '../src'
import { isProxy } from '../src/views'

let manager: ReturnType<typeof redox>
beforeEach(() => {
	manager = redox()
})

describe('defineModel/views', () => {
	it('should throw error if changed state in a view', () => {
		let initState = {
			a: 0,
		}
		const model = defineModel({
			name: 'model',
			state: initState,
			views: {
				view() {
					const state = this.$state()
					state.a = 1
					return this.$state()
				},
			},
		})
		const store = manager.get(model)
		expect(() => store.view()).toThrow()
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
		const store = manager.get(sample)

		const value = store.viewA()
		store.changeB()
		expect(store.viewA()).toBe(value)
	})

	it("should not be invoked when deps don't change", () => {
		let calltime = 0
		const sample = defineModel({
			name: 'sample',
			state: {
				a: 0,
				b: 1,
			},
			reducers: {
				changeA(state) {
					return {
						...state,
						a: state.a + 1,
					}
				},
			},
			views: {
				doubleB() {
					calltime++
					return this.b * 2
				},
			},
		})
		const store = manager.get(sample)

		expect(calltime).toBe(0)
		store.doubleB()
		expect(calltime).toBe(1)
		store.changeA()
		store.doubleB()
		expect(calltime).toBe(1)
	})

	it("should not be invoked when deps don't change (complex)", () => {
		let sampleComputeTimes = 0
		const sample = defineModel({
			name: 'sample',
			state: {
				value: 0,
				value1: {
					a: {
						b: 'b',
					},
				},
			},
			reducers: {
				change(state) {
					return {
						...state,
						value: 1,
					}
				},
			},
			views: {
				sampleView() {
					const value1 = this.value1
					sampleComputeTimes++
					const a = value1.a
					return a.b
				},
			},
		})
		const store = manager.get(sample)

		expect(sampleComputeTimes).toBe(0)
		store.sampleView()
		expect(sampleComputeTimes).toBe(1)
		store.change()
		store.sampleView()
		expect(sampleComputeTimes).toBe(1)
	})

	it("should not be invoked when deps don't change (nested views)", () => {
		let selfViewComputeTimes = 0
		const selfView = defineModel({
			name: 'selfView',
			state: {
				value: 0,
				value1: {
					a: {
						b: 'b',
					},
				},
			},
			reducers: {
				change(state) {
					return {
						...state,
						value: 1,
					}
				},
			},
			views: {
				selfView() {
					const value1 = this.value1
					selfViewComputeTimes++
					return value1.a
				},
				objView() {
					return this.selfView()
				},
			},
		})
		const store = manager.get(selfView)

		expect(selfViewComputeTimes).toBe(0)

		store.objView()
		expect(selfViewComputeTimes).toBe(1)
		store.change()
		store.objView()
		expect(selfViewComputeTimes).toBe(1)
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
			views: {
				getFoo() {
					calltime++
					return this.$state().foo
				},
			},
		})

		const store = manager.get(model)
		expect(calltime).toBe(0)
		store.getFoo()
		store.getFoo()
		expect(calltime).toBe(1)

		store.changeValue()
		store.getFoo()
		expect(calltime).toBe(2)
	})

	it('should return last value', () => {
		let calltime = 0
		const sample = defineModel({
			name: 'sample',
			state: {
				a: 0,
				b: {},
				c: {
					foo: 'bar',
				},
			},
			reducers: {
				changeA(state, newValue: number) {
					return {
						...state,
						a: newValue,
					}
				},
				changeB(state, newValue: any) {
					return {
						...state,
						b: newValue,
					}
				},
				changeC(state, newValue: string) {
					return {
						...state,
						c: {
							...state.c,
							foo: newValue,
						},
					}
				},
			},
			views: {
				viewA() {
					calltime++
					return this.a
				},
				viewB() {
					calltime++
					return this.b
				},
				viewC() {
					calltime++
					return this.c.foo
				},
			},
		})
		const store = manager.get(sample)

		store.changeA(10)
		expect(calltime).toBe(0)
		expect(store.viewA()).toBe(10)
		expect(store.viewA()).toBe(10)
		expect(calltime).toBe(1)
		let newB = {}
		store.changeB(newB)
		expect(calltime).toBe(1)
		expect(store.viewB()).toBe(newB)
		expect(store.viewB()).toBe(newB)
		expect(calltime).toBe(2)
		store.changeC('zoo')
		expect(calltime).toBe(2)
		expect(store.viewC()).toBe('zoo')
		expect(store.viewC()).toBe('zoo')
		expect(calltime).toBe(3)
	})

	it('should return last value (change view args)', () => {
		const model = defineModel({
			name: 'model',
			state: {
				a: 0,
			},
			reducers: {
				changeA(state) {
					return {
						a: state.a + 1,
					}
				},
			},
			views: {
				plusA(n: number) {
					return this.a + n
				},
				wrapA(obj: any) {
					return {
						...obj,
						value: this.a,
					}
				},
			},
		})
		const store = manager.get(model)
		expect(store.plusA(1)).toBe(1)
		store.changeA()
		expect(store.plusA(1)).toBe(2)

		let obj = {}
		let r = store.wrapA(obj)
		expect(r.value).toBe(1)
		// should return the same reference
		expect(store.wrapA(obj)).toBe(r)
		// should return new reference
		expect(store.wrapA({})).not.toBe(r)
	})

	it('should return last value (replace state)', () => {
		let initState = {
			a: 0,
		}
		const model = defineModel({
			name: 'model',
			state: initState,
			reducers: {
				replaceState(_state, newState: any) {
					return newState
				},
			},
			views: {
				view() {
					return this.$state()
				},
			},
		})
		const store = manager.get(model)
		expect(store.view()).toBe(initState)
		const newState = {}
		store.replaceState(newState)
		expect(store.view()).toBe(newState)
	})

	it('should return last value (using this.$state() in view)', () => {
		let numberOfCalls = 0
		const immerExample = defineModel({
			name: 'immerExample',
			state: {
				other: 'other value',
				level1: {
					level2: {
						level3: 'initial',
					},
				},
			},
			reducers: {
				assignNewObject: (state) => {
					state.level1.level2 = {
						level3: 'initial',
					}
				},
				changeValue: (state, payload: string) => {
					state.level1.level2 = {
						level3: payload,
					}
				},
			},
			views: {
				getState() {
					numberOfCalls++
					return this.$state()
				},
				getLevel1() {
					numberOfCalls++
					return this.$state().level1
				},
				getLevel2() {
					numberOfCalls++
					return this.$state().level1.level2
				},
				getLevel3() {
					numberOfCalls++
					return this.$state().level1.level2.level3
				},
			},
		})

		const store = manager.get(immerExample)

		expect(numberOfCalls).toBe(0)

		store.getState()
		expect(numberOfCalls).toBe(1)

		store.getLevel1()
		expect(numberOfCalls).toBe(2)

		store.getLevel2()
		expect(numberOfCalls).toBe(3)

		store.getLevel3()
		expect(numberOfCalls).toBe(4)

		store.$modify((state) => {
			state.other = 'modify other value'
		})

		store.getLevel1()
		expect(numberOfCalls).toBe(4)

		store.getLevel2()
		expect(numberOfCalls).toBe(4)

		store.getLevel3()
		expect(numberOfCalls).toBe(4)
	})

	describe('view with depends', () => {
		it('should not be invoked if no dep update', () => {
			const modelA = defineModel({
				name: 'modelA',
				state: {
					a: 0,
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
			})
			let calltime = 0
			const sample = defineModel(
				{
					name: 'sample',
					state: {},
					reducers: {},
					views: {
						viewA() {
							calltime++
							return this.$dep.modelA.a
						},
					},
				},
				[modelA]
			)
			const store = manager.get(sample)

			expect(calltime).toBe(0)
			store.viewA()
			expect(calltime).toBe(1)
			manager.get(modelA).changeB()
			store.viewA()
			expect(calltime).toBe(1)
		})

		it('should return last state', () => {
			const modelA = defineModel({
				name: 'modelA',
				state: {
					a: 0,
				},
				reducers: {
					changeA(state) {
						return {
							a: state.a + 1,
						}
					},
				},
				views: {
					doubleA() {
						return this.a * 2
					},
				},
			})
			const sample = defineModel(
				{
					name: 'sample',
					state: {},
					reducers: {},
					views: {
						viewA() {
							return this.$dep.modelA.doubleA()
						},
					},
				},
				[modelA]
			)
			const store = manager.get(sample)
			const storeA = manager.get(modelA)
			expect(store.viewA()).toBe(0)
			storeA.changeA()
			expect(storeA.doubleA()).toBe(2)
			expect(store.viewA()).toBe(2)
		})

		it('should return last state (change args)', () => {
			const modelA = defineModel({
				name: 'modelA',
				state: {
					a: 0,
				},
				reducers: {
					changeA(state) {
						return {
							a: state.a + 1,
						}
					},
				},
				views: {
					plusA(n: number) {
						return this.a + n
					},
				},
			})
			const sample = defineModel(
				{
					name: 'sample',
					state: {},
					reducers: {},
					views: {
						viewA(n: number) {
							return this.$dep.modelA.plusA(n)
						},
					},
				},
				[modelA]
			)
			const store = manager.get(sample)
			const storeA = manager.get(modelA)
			expect(store.viewA(1)).toBe(1)
			storeA.changeA()
			expect(storeA.plusA(1)).toBe(2)
			expect(store.viewA(1)).toBe(2)
		})
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
				views: {
					getState() {
						numberOfCalls++
						return this.$state()
					},
				},
			})

			const numberStore = manager.get(numberModel)

			let valueFromViews

			expect(numberOfCalls).toBe(0)
			valueFromViews = numberStore.getState()
			expect(numberOfCalls).toBe(1)
			expect(valueFromViews).toBe(0)

			numberStore.doNothing()
			valueFromViews = numberStore.getState()
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
				views: {
					getState() {
						numberOfCalls++
						return this.$state()
					},
				},
			})

			const numberStore = manager.get(numberModel)

			let valueFromViews

			expect(numberOfCalls).toBe(0)
			valueFromViews = numberStore.getState()
			expect(numberOfCalls).toBe(1)
			expect(valueFromViews).toBe(0)

			numberStore.increment()
			valueFromViews = numberStore.getState()
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
				views: {
					getArr(index: number) {
						numberOfCalls++
						return this.$state()[index]
					},
				},
			})

			const arrayStore = manager.get(arrayModel)

			let valueFromViews

			expect(numberOfCalls).toBe(0)
			valueFromViews = arrayStore.getArr(0)
			expect(numberOfCalls).toBe(1)
			expect(valueFromViews).toEqual(0)

			arrayStore.doNothing()
			valueFromViews = arrayStore.getArr(0)
			expect(numberOfCalls).toBe(1)
			expect(valueFromViews).toEqual(0)

			valueFromViews = arrayStore.getArr(1)
			expect(numberOfCalls).toBe(2)
			expect(valueFromViews).toEqual(1)
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
				views: {
					getArr(index: number) {
						numberOfCalls++
						return this.$state()[index]
					},
					getState() {
						numberOfCalls++
						return this.$state()
					},
				},
			})

			const arrayStore = manager.get(arrayModel)

			let valueFromViews

			expect(numberOfCalls).toBe(0)
			valueFromViews = arrayStore.getState()
			expect(numberOfCalls).toBe(1)
			expect(valueFromViews).toEqual([0])

			arrayStore.append(1)
			valueFromViews = arrayStore.getState()
			expect(numberOfCalls).toBe(2)
			expect(valueFromViews).toEqual([0, 1])

			valueFromViews = arrayStore.getArr(0)
			expect(numberOfCalls).toBe(3)
			expect(valueFromViews).toEqual(0)

			arrayStore.append(1)
			valueFromViews = arrayStore.getArr(0)
			expect(numberOfCalls).toBe(3)
			expect(valueFromViews).toEqual(0)

			arrayStore.remove(0)
			valueFromViews = arrayStore.getArr(0)
			expect(numberOfCalls).toBe(4)
			expect(valueFromViews).toEqual(1)

			valueFromViews = arrayStore.getArr(1)
			expect(numberOfCalls).toBe(5)
			expect(valueFromViews).toEqual(1)
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
				views: {
					getB() {
						return this.a.b
					},
				},
			})

			const deepObjStore = manager.get(deepObjModel)

			const b = deepObjStore.getB()

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

			const deepObjStore = manager.get(deepObjModel)

			const newObj = deepObjStore.getNewObj()

			expect(isProxyObj(newObj)).toBeFalsy()
		})
	})
})
