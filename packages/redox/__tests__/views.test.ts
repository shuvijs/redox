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
})
