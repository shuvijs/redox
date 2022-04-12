import { defineModel, redox } from '../src'
let manager: ReturnType<typeof redox>

describe('model-cache:', () => {
	test('initialState worked', () => {
		manager = redox({
			count: {
				value: 1
			}
		})
		const count = defineModel(
			{
				name: 'count',
				state: { value: 0 },
				reducers: {
					increment(state, payload: number) {
						state.value = state.value + payload
					},
				},
			},
		)

		const store = manager.get(count)
		expect(store.getState()).toEqual({ value: 1 })
		store.dispatch.increment(1)
		expect(store.getState()).toEqual({ value: 2 })

	})

	test('complex models works', () => {
		manager = redox()
		const count = defineModel({
			name: 'count',
			state: { value: 0 },
			reducers: {
				increment(state, payload: number = 1) {
					state.value = state.value + payload
				},
			},
		})

		const other = defineModel(
			{
				name: 'other',
				state: {
					other: ['other'],
				},
				reducers: {
					add: (state, step: string) => {
						return {
							...state,
							other: [...state.other, step],
						}
					},
				},
			},
			[count]
		)

		const dome = defineModel({
			name: 'dome',
			state: {
				number: 1,
			},
			reducers: {
				add: (state, step: number) => {
					// return state;
					return {
						...state,
						number: state.number + step,
					}
				},
			},
		})

		const otherCount = defineModel(
			{
				name: 'other|count',
				state: [] as string[],
				reducers: {
					add: (state, step: string) => {
						return [...state, step]
					},
				},
				effects:{
					useCount(_payload, _state, depends) {
						const { getState } = depends;
						const countState = getState().count
						this.add(countState.value.toString())
					}
				}
			},
			[ other, count ]
		)

		const user = defineModel(
			{
				name: 'user-other_dome',
				state: {
					id: 1,
					name: 'haha',
				},
				reducers: {
					add: (state, step) => {
						return {
							...state,
							id: state.id + step,
						}
					},
				},
				effects: {
					async depends(_payload: string, state, depends) {
						const { getState, dispatch } = depends
						const dependsState = getState()
						dispatch.other({ type: 'add', payload: 'use1 paly' })
						dispatch.other.add(dependsState.dome.toString())
						dispatch.dome.add(1)
						state.id++
					},
				},
				views: {
					d(state, dependsState): { number: number } {
						console.log(state.id)
						const a = dependsState.other
						console.log(dependsState.dome.number)
						console.log(a.other[0])
						console.log('d computed')
						return dependsState.dome
					},
					one(_state, dependsState): number {
						return dependsState.dome.number
					},
					s(state, _dependsState, args): string {
						// console.log('views', state, rootState, views, args);
						// console.log('this', this)
						// console.log('this', views.one)
						// return state.id * args;
						console.log('double computed')
						return `state.id=>${state.id}, args=>${args},views.one=>${this.one}`
					},
				},
			},
			[other, dome]
		)
		const countStore = manager.get(count)
		const domeStore = manager.get(dome)

		expect(manager.getChangedState()).toEqual({})
		expect(manager.get(user).views.d()).toEqual({ number: 1 })
		expect(manager.get(user).views.one()).toEqual(1)
		expect(manager.get(user).views.s(2)).toEqual(
			'state.id=>1, args=>2,views.one=>1'
		)
		countStore.dispatch.increment(1)
		domeStore.dispatch.add(2)
		expect(manager.getChangedState()).toEqual({
			count: {
				value: 1,
			},
			dome: {
				number: 3,
			},
		})
		expect(manager.get(user).views.d()).toEqual({ number: 3 })
		expect(manager.get(user).views.one()).toEqual(3)
		expect(manager.get(user).views.s(undefined)).toEqual(
			'state.id=>1, args=>undefined,views.one=>3'
		)

		const otherCountStore = manager.get(otherCount);
		otherCountStore.dispatch.useCount(undefined);

		expect(otherCountStore.getState()).toEqual(["1"])
		
		manager.destroy();

	})
})
