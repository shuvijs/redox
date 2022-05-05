import { defineModel, redox } from '../src'
let manager: ReturnType<typeof redox>
beforeEach(() => {
	manager = redox()
})
describe('views worked:', () => {
	test('compute view can automatic collect the state which view used', () => {
		let firstComputeTimes = 0
		const first = defineModel({
			name: 'first',
			state: {
				first_Object: {
					first_a: {
						arr: [1, 2, 3],
					},
					first_b: {
						number: 1,
					},
				},
			},
			reducers: {
				changedB: (state) => {
					return {
						first_Object: {
							first_a: state.first_Object.first_a,
							first_b: {
								number: 2,
							},
						},
					}
				},
			},
			views: {
				first_view(state) {
					firstComputeTimes++
					return state.first_Object.first_a.arr[0]
				},
			},
		})
		const firstStore = manager.get(first)

		let viewsValue

		expect(firstComputeTimes).toBe(0)

		viewsValue = firstStore.first_view()
		expect(firstComputeTimes).toBe(1)
		expect(firstStore.first_view()).toEqual(viewsValue)
		expect(firstComputeTimes).toBe(1)
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
				first_c_view(state) {
					firstComputeTimes++
					return state.first_Object.a.b.c
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

	test('computed when args changed', () => {
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
					return state
				},
				changedC: (state) => {
					state.first_Object.a.b.c = 'd'
					return state
				},
			},
			views: {
				first_c_view: (state, _dependsState, args) => {
					firstComputeTimes++
					return state.first_Object.a.b.c + args
				},
			},
		})

		const firstStore = manager.get(first)

		let viewsValue

		expect(firstComputeTimes).toBe(0)
		viewsValue = firstStore.first_c_view('z')
		expect(firstComputeTimes).toBe(1)
		expect(viewsValue).toBe('cz')

		viewsValue = firstStore.first_c_view('v')
		expect(firstComputeTimes).toBe(2)
		expect(viewsValue).toBe('cv')

		firstStore.changedC()
		viewsValue = firstStore.first_c_view('z')
		expect(firstComputeTimes).toBe(3)
		expect(viewsValue).toBe('dz')
	})

	test('works with views call self', () => {
		let firstViewComputeTimes = 0
		let firstCViewComputeTimes = 0
		const second = defineModel({
			name: 'second',
			state: {
				second_Object: {
					second_a: {
						arr: [1, 2, 3],
					},
					second_b: {
						number: 1,
					},
				},
			},
			reducers: {
				changedB(state) {
					return {
						second_Object: {
							second_a: state.second_Object.second_a,
							second_b: {
								number: 2,
							},
						},
					}
				},
				changedArr(state) {
					return {
						second_Object: {
							second_a: {
								arr: [2, 3, 4],
							},
							second_b: state.second_Object.second_b,
						},
					}
				},
			},
		})
		const first = defineModel(
			{
				name: 'first',
				state: {
					first_a: {
						arr: [1, 2, 3],
					},
					first_b: {
						number: 1,
					},
				},
				reducers: {
					changedNumber: (state) => {
						return {
							...state,
							first_b: {
								number: 2,
							},
						}
					},
				},
				views: {
					first_a_view(state) {
						return state.first_a.arr[0]
					},
					first_b_view(state) {
						return state.first_b.number
					},
					first_c_view(state, dependsState): number {
						firstCViewComputeTimes += 1
						const first_b_view = this.first_b_view
						const number = state.first_b.number
						const first_a_view = this.first_a_view
						const second = dependsState.second.second_Object.second_b.number
						return first_b_view + number + first_a_view + second
					},
					first_view(): number {
						firstViewComputeTimes += 1
						return this.first_a_view + this.first_c_view
					},
				},
			},
			[second]
		)

		const firstStore = manager.get(first)
		const secondStore = manager.get(second)

		let viewsValue

		expect(firstViewComputeTimes).toBe(0)
		expect(firstCViewComputeTimes).toBe(0)

		viewsValue = firstStore.first_view()
		firstStore.first_c_view()
		expect(viewsValue).toBe(5)
		expect(firstViewComputeTimes).toBe(1)
		expect(firstCViewComputeTimes).toBe(1)

		viewsValue = firstStore.first_view()
		firstStore.first_c_view()
		expect(viewsValue).toBe(5)
		expect(firstViewComputeTimes).toBe(1)
		expect(firstCViewComputeTimes).toBe(1)

		firstStore.changedNumber()

		viewsValue = firstStore.first_view()
		expect(viewsValue).toBe(7)
		expect(firstViewComputeTimes).toBe(2)
		expect(firstCViewComputeTimes).toBe(2)

		secondStore.changedB()

		viewsValue = firstStore.first_view()
		expect(viewsValue).toBe(8)
		expect(firstViewComputeTimes).toBe(3)
		expect(firstCViewComputeTimes).toBe(3)

		secondStore.changedArr()

		viewsValue = firstStore.first_view()
		expect(viewsValue).toBe(8)
		expect(firstViewComputeTimes).toBe(3)
		expect(firstCViewComputeTimes).toBe(3)
	})

	test('should computed when depends changed', () => {
		let firstComputeTimes = 0
		const first = defineModel({
			name: 'first',
			state: {
				first_Object: {
					first_a: {
						arr: [1, 2, 3],
					},
					first_b: {
						number: 1,
					},
				},
			},
			reducers: {
				changedB: (state) => {
					return {
						first_Object: {
							first_a: state.first_Object.first_a,
							first_b: {
								number: 2,
							},
						},
					}
				},
			},
			views: {
				first_view(state) {
					firstComputeTimes++
					return state.first_Object.first_a.arr[0]
				},
			},
		})
		let secondComputeTimes = 0
		const second = defineModel(
			{
				name: 'second',
				state: {
					second_Object: {
						second_a: {
							arr: [1, 2, 3],
						},
						second_b: {
							number: 1,
						},
					},
				},
				reducers: {
					changedB: (state) => {
						return {
							second_Object: {
								second_a: state.second_Object.second_a,
								second_b: {
									number: 2,
								},
							},
						}
					},
				},
				views: {
					second_view(state, dependsState) {
						secondComputeTimes++
						return (
							dependsState.first.first_Object.first_a.arr[0] +
							state.second_Object.second_b.number
						)
					},
					// other: (state, dependsState)=>{
					// }
				},
			},
			[first]
		)

		const firstStore = manager.get(first)
		const secondStore = manager.get(second)

		let viewsValue

		expect(firstComputeTimes).toBe(0)
		expect(secondComputeTimes).toBe(0)

		viewsValue = secondStore.second_view()
		firstStore.first_view()
		expect(secondComputeTimes).toBe(1)
		expect(firstComputeTimes).toBe(1)
		expect(viewsValue).toBe(2)

		viewsValue = secondStore.second_view()
		firstStore.first_view()
		expect(secondComputeTimes).toBe(1)
		expect(firstComputeTimes).toBe(1)
		expect(viewsValue).toBe(2)

		firstStore.changedB()

		viewsValue = secondStore.second_view()
		firstStore.first_view()
		expect(secondComputeTimes).toBe(1)
		expect(firstComputeTimes).toBe(1)
		expect(viewsValue).toBe(2)

		secondStore.changedB()

		viewsValue = secondStore.second_view()

		expect(secondComputeTimes).toBe(2)
		expect(viewsValue).toBe(3)
	})
})
