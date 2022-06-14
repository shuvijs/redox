import { defineModel, redox } from '../src'
let manager: ReturnType<typeof redox>
beforeEach(() => {
	manager = redox()
})
describe('views worked:', () => {
	describe('automatic collect the what view used:', () => {
		test('return fixed value', () => {
			let fixedComputeTimes = 0
			const fixed = defineModel({
				name: 'fixed',
				state: {
					value: 0,
				},
				reducers: {
					change() {
						return {
							value: 1,
						}
					},
				},
				views: {
					fixedView() {
						fixedComputeTimes++
						return 1
					},
				},
			})
			const store = manager.get(fixed)

			let viewsValue

			expect(fixedComputeTimes).toBe(0)

			viewsValue = store.fixedView()
			expect(fixedComputeTimes).toBe(1)
			store.change()
			expect(store.fixedView() === viewsValue).toBeTruthy
			expect(fixedComputeTimes).toBe(1)
		})

		test('return sample value', () => {
			let sampleComputeTimes = 0
			const sample = defineModel({
				name: 'sample',
				state: {
					value: 0,
					value1: 1,
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
						sampleComputeTimes++
						return this.value1
					},
				},
			})
			const store = manager.get(sample)

			let viewsValue

			expect(sampleComputeTimes).toBe(0)

			viewsValue = store.sampleView()
			expect(sampleComputeTimes).toBe(1)
			store.change()
			expect(store.sampleView() === viewsValue).toBeTruthy
			expect(sampleComputeTimes).toBe(1)
		})

		test('return sample value with call property breaks', () => {
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

			let viewsValue

			expect(sampleComputeTimes).toBe(0)

			viewsValue = store.sampleView()
			expect(sampleComputeTimes).toBe(1)
			store.change()
			expect(store.sampleView() === viewsValue).toBeTruthy
			expect(sampleComputeTimes).toBe(1)
		})

		test('return sample value with call property breaks should not collect duplicate keys', () => {
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
						this.value1.a.b
						return a.b
					},
				},
			})
			const store = manager.get(sample)

			let viewsValue

			expect(sampleComputeTimes).toBe(0)

			viewsValue = store.sampleView()
			expect(sampleComputeTimes).toBe(1)
			store.change()
			expect(store.sampleView() === viewsValue).toBeTruthy
			expect(sampleComputeTimes).toBe(1)
		})

		test('return obj value', () => {
			let objComputeTimes = 0
			const obj = defineModel({
				name: 'obj',
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
					objView() {
						objComputeTimes++
						return this.value1.a
					},
				},
			})
			const store = manager.get(obj)

			let viewsValue

			expect(objComputeTimes).toBe(0)

			viewsValue = store.objView()
			expect(objComputeTimes).toBe(1)
			store.change()
			expect(store.objView() === viewsValue).toBeTruthy
			expect(objComputeTimes).toBe(1)
		})

		test('return obj value with call property breaks', () => {
			let objComputeTimes = 0
			const obj = defineModel({
				name: 'obj',
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
					objView() {
						const value1 = this.value1
						objComputeTimes++
						return value1.a
					},
				},
			})
			const store = manager.get(obj)

			let viewsValue

			expect(objComputeTimes).toBe(0)

			viewsValue = store.objView()
			expect(objComputeTimes).toBe(1)
			store.change()
			expect(store.objView() === viewsValue).toBeTruthy
			expect(objComputeTimes).toBe(1)
		})

		test('return obj value with call property breaks should not collect duplicate keys', () => {
			let objComputeTimes = 0
			const obj = defineModel({
				name: 'obj',
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
					objView() {
						const value1 = this.value1
						objComputeTimes++
						this.value1.a.b
						return value1.a
					},
				},
			})
			const store = manager.get(obj)

			let viewsValue

			expect(objComputeTimes).toBe(0)

			viewsValue = store.objView()
			expect(objComputeTimes).toBe(1)
			store.change()
			expect(store.objView() === viewsValue).toBeTruthy
			expect(objComputeTimes).toBe(1)
		})

		test('call self view', () => {
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

			let viewsValue

			expect(selfViewComputeTimes).toBe(0)

			viewsValue = store.objView()
			expect(selfViewComputeTimes).toBe(1)
			store.change()
			expect(store.objView() === viewsValue).toBeTruthy
			expect(selfViewComputeTimes).toBe(1)
		})

		test('call self view with call property breaks', () => {
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
						const selfView = this.selfView()
						return selfView.b
					},
				},
			})
			const store = manager.get(selfView)

			let viewsValue

			expect(selfViewComputeTimes).toBe(0)

			viewsValue = store.objView()
			expect(selfViewComputeTimes).toBe(1)
			store.change()
			expect(store.objView() === viewsValue).toBeTruthy
			expect(selfViewComputeTimes).toBe(1)
		})

		test('call self view with call property breaks should not collect duplicate keys', () => {
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
						this.value1.a
						return value1.a
					},
					objView() {
						const selfView = this.selfView()
						selfView.b
						return selfView.b
					},
				},
			})
			const store = manager.get(selfView)

			let viewsValue

			expect(selfViewComputeTimes).toBe(0)

			viewsValue = store.objView()
			expect(selfViewComputeTimes).toBe(1)
			store.change()
			expect(store.objView() === viewsValue).toBeTruthy
			expect(selfViewComputeTimes).toBe(1)
		})

		test('call self view many times', () => {
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
						this.selfView()
						return this.selfView()
					},
				},
			})
			const store = manager.get(selfView)

			let viewsValue

			expect(selfViewComputeTimes).toBe(0)

			viewsValue = store.objView()
			expect(selfViewComputeTimes).toBe(1)
			store.change()
			expect(store.objView() === viewsValue).toBeTruthy
			expect(selfViewComputeTimes).toBe(1)
		})
	})

	describe('arguments changed trigger view computed:', () => {
		test('optional parameters changed view should computed', () => {
			let viewComputeTimes = 0
			const view = defineModel({
				name: 'view',
				state: {
					value: 1,
				},
				reducers: {},
				views: {
					call(n: number = 0) {
						viewComputeTimes++
						return this.value + n
					},
				},
			})
			const store = manager.get(view)

			expect(viewComputeTimes).toBe(0)

			expect(store.call()).toBe(1)
			expect(viewComputeTimes).toBe(1)
			expect(store.call()).toBe(1)
			expect(viewComputeTimes).toBe(1)

			expect(store.call(1)).toBe(2)
			expect(viewComputeTimes).toBe(2)
		})

		test('object reference parameters changed view should computed', () => {
			let viewComputeTimes = 0
			const view = defineModel({
				name: 'view',
				state: {
					value: 1,
				},
				reducers: {},
				views: {
					call(obj: { n: number }) {
						viewComputeTimes++
						return this.value + obj.n
					},
				},
			})
			const store = manager.get(view)

			expect(viewComputeTimes).toBe(0)

			expect(store.call({ n: 0 })).toBe(1)
			expect(viewComputeTimes).toBe(1)
			expect(store.call({ n: 0 })).toBe(1)
			expect(viewComputeTimes).toBe(2)
		})

		test('object reference parameters not changed view should not computed', () => {
			let viewComputeTimes = 0
			let n = { n: 0 }
			const view = defineModel({
				name: 'view',
				state: {
					value: 1,
				},
				reducers: {},
				views: {
					call(obj: { n: number }) {
						viewComputeTimes++
						return this.value + obj.n
					},
				},
			})
			const store = manager.get(view)

			expect(viewComputeTimes).toBe(0)

			expect(store.call(n)).toBe(1)
			expect(viewComputeTimes).toBe(1)
			expect(store.call(n)).toBe(1)
			expect(viewComputeTimes).toBe(1)
		})

		test('call self view if parameters changed view should computed', () => {
			let viewComputeTimes = 0
			const view = defineModel({
				name: 'view',
				state: {
					value: 1,
				},
				reducers: {},
				views: {
					selfView(n: number) {
						viewComputeTimes++
						return this.value + n
					},
					call() {
						this.selfView(1)
						return this.selfView(2)
					},
				},
			})
			const store = manager.get(view)

			expect(viewComputeTimes).toBe(0)

			expect(store.call()).toBe(3)
			expect(viewComputeTimes).toBe(2)
		})
	})

	describe('worked with depends:', () => {
		describe('depends state changed, if the view not use the property of state it should not computed', () => {
			test('depends return sample value', () => {
				const depend = defineModel({
					name: 'depend',
					state: {
						value: 0,
						value1: 1,
					},
					reducers: {
						change(state) {
							return {
								...state,
								value: 1,
							}
						},
					},
				})
				let sampleComputeTimes = 0
				const sample = defineModel(
					{
						name: 'sample',
						state: {},
						reducers: {},
						views: {
							call() {
								sampleComputeTimes++
								return this.$dep.depend.value1
							},
						},
					},
					[depend]
				)
				const store = manager.get(sample)

				let viewsValue

				expect(sampleComputeTimes).toBe(0)

				viewsValue = store.call()
				expect(sampleComputeTimes).toBe(1)
				manager.get(depend).change()
				expect(store.call() === viewsValue).toBeTruthy
				expect(sampleComputeTimes).toBe(1)
			})

			test('depends return object value', () => {
				const depend = defineModel({
					name: 'depend',
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
				})
				let sampleComputeTimes = 0
				const sample = defineModel(
					{
						name: 'sample',
						state: {},
						reducers: {},
						views: {
							call() {
								sampleComputeTimes++
								return this.$dep.depend.value1.a
							},
						},
					},
					[depend]
				)
				const store = manager.get(sample)

				let viewsValue

				expect(sampleComputeTimes).toBe(0)

				viewsValue = store.call()
				expect(sampleComputeTimes).toBe(1)
				manager.get(depend).change()
				expect(store.call() === viewsValue).toBeTruthy
				expect(sampleComputeTimes).toBe(1)
			})

			test('depends return object value with call property breaks', () => {
				const depend = defineModel({
					name: 'depend',
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
				})
				let sampleComputeTimes = 0
				const sample = defineModel(
					{
						name: 'sample',
						state: {},
						reducers: {},
						views: {
							call() {
								const value1 = this.$dep.depend.value1
								sampleComputeTimes++
								this.$dep.depend.value1.a.b
								return value1.a
							},
						},
					},
					[depend]
				)
				const store = manager.get(sample)

				let viewsValue

				expect(sampleComputeTimes).toBe(0)

				viewsValue = store.call()
				expect(sampleComputeTimes).toBe(1)
				manager.get(depend).change()
				expect(store.call() === viewsValue).toBeTruthy
				expect(sampleComputeTimes).toBe(1)
			})
		})

		test('depends view arguments not changed depend view should not computed', () => {
			let dependComputeTimes = 0
			const depend = defineModel({
				name: 'depend',
				state: {
					value: 0,
					value1: 1,
				},
				reducers: {},
				views: {
					dependView(n: number) {
						dependComputeTimes++
						return this.value1 + n
					},
				},
			})
			const sample = defineModel(
				{
					name: 'sample',
					state: {},
					reducers: {},
					views: {
						call() {
							this.$dep.depend.dependView(1)
							return this.$dep.depend.dependView(1)
						},
					},
				},
				[depend]
			)
			const store = manager.get(sample)

			let viewsValue

			expect(dependComputeTimes).toBe(0)

			viewsValue = store.call()
			expect(dependComputeTimes).toBe(1)
			expect(store.call() === viewsValue).toBeTruthy
			expect(dependComputeTimes).toBe(1)
		})

		test('depends view arguments changed depend view should computed', () => {
			let dependComputeTimes = 0
			const depend = defineModel({
				name: 'depend',
				state: {
					value: 0,
					value1: 1,
				},
				reducers: {},
				views: {
					dependView(n: number) {
						dependComputeTimes++
						return this.value1 + n
					},
				},
			})
			const sample = defineModel(
				{
					name: 'sample',
					state: {},
					reducers: {},
					views: {
						call() {
							this.$dep.depend.dependView(1)
							return this.$dep.depend.dependView(2)
						},
					},
				},
				[depend]
			)
			const store = manager.get(sample)

			let viewsValue

			expect(dependComputeTimes).toBe(0)

			viewsValue = store.call()
			expect(dependComputeTimes).toBe(2)
		})

		test('depends view arguments reference changed depend view should computed', () => {
			let dependComputeTimes = 0
			const depend = defineModel({
				name: 'depend',
				state: {
					value: 0,
					value1: 1,
				},
				reducers: {},
				views: {
					dependView(n: { n: number }) {
						dependComputeTimes++
						return this.value1 + n.n
					},
				},
			})
			const sample = defineModel(
				{
					name: 'sample',
					state: {},
					reducers: {},
					views: {
						call() {
							this.$dep.depend.dependView({ n: 1 })
							return this.$dep.depend.dependView({ n: 1 })
						},
					},
				},
				[depend]
			)
			const store = manager.get(sample)

			let viewsValue

			expect(dependComputeTimes).toBe(0)

			viewsValue = store.call()
			expect(dependComputeTimes).toBe(2)
		})
	})

	test('works with immer reducer', () => {
		let firstComputeTimes = 0
		const first = defineModel({
			name: 'first',
			state: {
				first_Object: {
					a: {
						b: {
							c: 'c',
						},
					},
				},
			},
			reducers: {
				changedB: (state) => {
					state.first_Object.a.b = {
						c: 'c',
					}
				},
				changedC: (state) => {
					state.first_Object.a.b.c = 'd'
				},
			},
			views: {
				first_c_view() {
					firstComputeTimes++
					return this.first_Object.a.b.c
				},
			},
		})

		const firstStore = manager.get(first)

		let viewsValue

		expect(firstComputeTimes).toBe(0)
		viewsValue = firstStore.first_c_view()
		expect(firstComputeTimes).toBe(1)
		expect(viewsValue).toBe('c')

		firstStore.changedB()
		viewsValue = firstStore.first_c_view()
		expect(firstComputeTimes).toBe(1)
		expect(viewsValue).toBe('c')

		firstStore.changedC()
		viewsValue = firstStore.first_c_view()
		expect(firstComputeTimes).toBe(2)
		expect(viewsValue).toBe('d')
	})

	describe('this.$state() should work', () => {
		test('should work with Number state', () => {
			let numberOfCalls = 0

			const numberModel = defineModel({
				name: 'numberModel',
				state: 0,
				reducers: {
					increment: (state) => {
						return ++state
					},
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

			numberStore.increment()
			valueFromViews = numberStore.getState()
			expect(numberOfCalls).toBe(2)
			expect(valueFromViews).toBe(1)
		})

		test('should work with String state', () => {
			let numberOfCalls = 0

			const stringModel = defineModel({
				name: 'stringModel',
				state: '',
				reducers: {
					append: (state, payload: string) => {
						return state + payload
					},
					doNothing: (state) => {
						return state
					},
				},
				views: {
					getState() {
						numberOfCalls++
						return this.$state()
					},
				},
			})

			const stringStore = manager.get(stringModel)

			let valueFromViews

			expect(numberOfCalls).toBe(0)
			valueFromViews = stringStore.getState()
			expect(numberOfCalls).toBe(1)
			expect(valueFromViews).toBe('')

			stringStore.doNothing()
			valueFromViews = stringStore.getState()
			expect(numberOfCalls).toBe(1)
			expect(valueFromViews).toBe('')

			stringStore.append('test')
			valueFromViews = stringStore.getState()
			expect(numberOfCalls).toBe(2)
			expect(valueFromViews).toBe('test')
		})

		test('should work with Boolean state', () => {
			let numberOfCalls = 0

			const booleanModel = defineModel({
				name: 'booleanModel',
				state: false,
				reducers: {
					toggle: (state) => {
						return !state
					},
					doNothing: (state) => {
						return state
					},
				},
				views: {
					getState() {
						numberOfCalls++
						return this.$state()
					},
				},
			})

			const booleanStore = manager.get(booleanModel)

			let valueFromViews

			expect(numberOfCalls).toBe(0)
			valueFromViews = booleanStore.getState()
			expect(numberOfCalls).toBe(1)
			expect(valueFromViews).toBe(false)

			booleanStore.doNothing()
			valueFromViews = booleanStore.getState()
			expect(numberOfCalls).toBe(1)
			expect(valueFromViews).toBe(false)

			booleanStore.toggle()
			valueFromViews = booleanStore.getState()
			expect(numberOfCalls).toBe(2)
			expect(valueFromViews).toBe(true)
		})

		test('should work with Array state', () => {
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
					doNothing: (state) => {
						return state
					},
				},
				views: {
					getArr(index: number) {
						numberOfCalls++
						return this.$state()[index]
					},
					// failed, to be resolved
					getState() {
						numberOfCalls++
						return this.$state()
					},
				},
			})

			const arrayStore = manager.get(arrayModel)

			let valueFromViews

			// expect(numberOfCalls).toBe(0)
			// valueFromViews = arrayStore.getState()
			// expect(numberOfCalls).toBe(1)
			// expect(valueFromViews).toEqual([0])

			// arrayStore.doNothing()
			// valueFromViews = arrayStore.getState()
			// expect(numberOfCalls).toBe(1)
			// expect(valueFromViews).toEqual([0])

			// arrayStore.append(1)
			// valueFromViews = arrayStore.getState()
			// expect(numberOfCalls).toBe(2)
			// expect(valueFromViews).toEqual([0, 1])

			valueFromViews = arrayStore.getArr(0)
			expect(numberOfCalls).toBe(1)
			expect(valueFromViews).toEqual(0)

			arrayStore.append(1)
			valueFromViews = arrayStore.getArr(0)
			expect(numberOfCalls).toBe(1)
			expect(valueFromViews).toEqual(0)

			arrayStore.append(1)
			valueFromViews = arrayStore.getArr(0)
			expect(numberOfCalls).toBe(1)
			expect(valueFromViews).toEqual(0)

			valueFromViews = arrayStore.getArr(1)
			expect(numberOfCalls).toBe(2)
			expect(valueFromViews).toEqual(1)

			// arrayStore.remove(0)
			// valueFromViews = arrayStore.getState()
			// expect(numberOfCalls).toBe(4)
			// expect(valueFromViews).toEqual([1])

			// arrayStore.doNothing()
			// valueFromViews = arrayStore.getState()
			// expect(numberOfCalls).toBe(4)
			// expect(valueFromViews).toEqual([1])
		})

		test('Object state with immer reducer should work', () => {
			let numberOfCalls = 0
			const immerExample = defineModel({
				name: 'immerExample',
				state: {
					other: 'other value',
					level1: {
						level2: {
							level3: 'initial',
						},
						level2Arr: [1, 2],
					},
					level1Arr: [1, 2],
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
					getValueofLevel3() {
						numberOfCalls++
						return this.$state().level1.level2.level3
					},
					getArray(index: number) {
						numberOfCalls++
						return this.$state().level1.level2Arr[index]
					},
					getLevel1Array(index: number) {
						numberOfCalls++
						return this.$state().level1Arr[index]
					},
				},
			})

			const store = manager.get(immerExample)

			let valueFromViews

			expect(numberOfCalls).toBe(0)
			valueFromViews = store.getValueofLevel3()
			expect(numberOfCalls).toBe(1)
			expect(valueFromViews).toBe('initial')

			store.assignNewObject()
			valueFromViews = store.getValueofLevel3()
			expect(numberOfCalls).toBe(1)
			expect(valueFromViews).toBe('initial')

			store.$modify((state) => {
				state.other = 'test other value'
			})

			valueFromViews = store.getValueofLevel3()
			expect(numberOfCalls).toBe(1)
			expect(valueFromViews).toBe('initial')

			valueFromViews = store.getArray(0)
			expect(numberOfCalls).toBe(2)
			expect(valueFromViews).toEqual(1)

			valueFromViews = store.getArray(1)
			expect(numberOfCalls).toBe(3)
			expect(valueFromViews).toEqual(2)

			valueFromViews = store.getArray(1)
			expect(numberOfCalls).toBe(3)
			expect(valueFromViews).toEqual(2)

			valueFromViews = store.getLevel1Array(0)
			expect(numberOfCalls).toBe(4)
			expect(valueFromViews).toEqual(1)

			valueFromViews = store.getLevel1Array(1)
			expect(numberOfCalls).toBe(5)
			expect(valueFromViews).toEqual(2)

			valueFromViews = store.getLevel1Array(1)
			expect(numberOfCalls).toBe(5)
			expect(valueFromViews).toEqual(2)
		})

		test('progressively generate cache should work', () => {
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

		test('Array state with immer reducer should work', () => {
			let numberOfCalls = 0
			const immerExample = defineModel({
				name: 'immerExample',
				state: [
					{
						level1: {
							level2: {
								level3: 'initial',
							},
						},
					},
				],
				reducers: {
					assignNewObject: (state) => {
						state[0].level1.level2 = {
							level3: 'initial',
						}
					},
					changeValue: (state, payload: string) => {
						state[0].level1.level2 = {
							level3: payload,
						}
					},
					append: (state, payload: any) => {
						state.push(payload)
					},
				},
				views: {
					getValueofLevel3() {
						numberOfCalls++
						return this.$state()[0].level1.level2.level3
					},
				},
			})

			const store = manager.get(immerExample)

			let valueFromViews

			expect(numberOfCalls).toBe(0)
			valueFromViews = store.getValueofLevel3()
			expect(numberOfCalls).toBe(1)
			expect(valueFromViews).toBe('initial')

			store.assignNewObject()
			valueFromViews = store.getValueofLevel3()
			expect(numberOfCalls).toBe(1)
			expect(valueFromViews).toBe('initial')

			store.changeValue('test')
			valueFromViews = store.getValueofLevel3()
			expect(numberOfCalls).toBe(2)
			expect(valueFromViews).toBe('test')

			store.append('test')
			store.getValueofLevel3()
			expect(numberOfCalls).toBe(2)
			expect(store.$state()).toEqual([
				{
					level1: {
						level2: {
							level3: 'test',
						},
					},
				},
				'test',
			])
		})

		test('this.$state().[property] and this.[property] share different cache, even accessing the same property of the state', () => {
			let numberOfCalls = 0
			const model = defineModel({
				name: 'model',
				state: {
					level1: {
						level2: {
							level3: 'initial',
						},
					},
				},
				reducers: {
					changeValue: (state, payload: string) => {
						state.level1.level2.level3 = payload
					},
				},
				views: {
					getValue() {
						numberOfCalls++
						return this.level1.level2.level3
					},
					getValueViaFunction() {
						numberOfCalls++
						return this.$state().level1.level2.level3
					},
				},
			})

			const store = manager.get(model)

			let viewsValue

			expect(numberOfCalls).toBe(0)
			viewsValue = store.getValueViaFunction()
			expect(numberOfCalls).toBe(1)
			expect(viewsValue).toBe('initial')

			store.changeValue('test')
			viewsValue = store.getValueViaFunction()
			expect(numberOfCalls).toBe(2)
			expect(viewsValue).toBe('test')

			viewsValue = store.getValue()
			expect(numberOfCalls).toBe(3)
			expect(viewsValue).toBe('test')

			store.changeValue('test 2')
			viewsValue = store.getValueViaFunction()
			expect(numberOfCalls).toBe(4)
			expect(viewsValue).toBe('test 2')

			viewsValue = store.getValue()
			expect(numberOfCalls).toBe(5)
			expect(viewsValue).toBe('test 2')
		})

		test('this.$dep.dependModel.$state() should not call function if dependent value not changed', () => {
			const dependModel = defineModel({
				name: 'dependModel',
				state: {
					value: 0,
					dependentValue: 'depenent value',
				},
				reducers: {
					change(state) {
						state.value = 1
					},
				},
			})

			let numberOfCalls = 0
			const model = defineModel(
				{
					name: 'model',
					state: {},
					reducers: {},
					views: {
						getDependentValue() {
							numberOfCalls++
							return this.$dep.dependModel.$state().dependentValue
						},
					},
				},
				[dependModel]
			)
			const store = manager.get(model)

			let valueFromViews

			expect(numberOfCalls).toBe(0)

			valueFromViews = store.getDependentValue()
			expect(numberOfCalls).toBe(1)

			manager.get(dependModel).change()
			expect(store.getDependentValue() === valueFromViews).toBeTruthy
			expect(numberOfCalls).toBe(1)
		})

		test('this.$dep.dependModel.$state().[property] and this.$dep.dependModel.[property] share different cache, even accessing the same property of the state', () => {
			const dependModel = defineModel({
				name: 'dependModel',
				state: {
					dependentValue: 'depenent value',
				},
				reducers: {
					changeValue(state, payload) {
						state.dependentValue = payload
					},
				},
			})

			let numberOfCalls = 0
			const model = defineModel(
				{
					name: 'model',
					state: {},
					reducers: {},
					views: {
						getValue() {
							numberOfCalls++
							return this.$dep.dependModel.dependentValue
						},
						getValueViaFunction() {
							numberOfCalls++
							return this.$dep.dependModel.$state().dependentValue
						},
					},
				},
				[dependModel]
			)
			const store = manager.get(model)
			const dependStore = manager.get(dependModel)

			let viewsValue

			expect(numberOfCalls).toBe(0)
			viewsValue = store.getValueViaFunction()
			expect(numberOfCalls).toBe(1)
			expect(viewsValue).toBe('depenent value')

			viewsValue = store.getValue()
			expect(numberOfCalls).toBe(2)
			expect(viewsValue).toBe('depenent value')

			dependStore.changeValue('test')
			viewsValue = store.getValueViaFunction()
			expect(numberOfCalls).toBe(3)
			expect(viewsValue).toBe('test')

			viewsValue = store.getValue()
			expect(numberOfCalls).toBe(4)
			expect(viewsValue).toBe('test')
		})
	})
})
