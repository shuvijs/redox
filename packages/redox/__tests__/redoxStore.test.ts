import { defineModel, redox } from '../src'
let manager: ReturnType<typeof redox>

describe('redox worked:', () => {
	test('always return a new instance', () => {
		const managerA = redox()
		const managerB = redox()
		expect(managerA).not.toBe(managerB)
	})
	test('initialState worked', () => {
		manager = redox({
			count: {
				value: 1,
			},
		})
		const count = defineModel({
			name: 'count',
			state: { value: 0 },
			reducers: {
				increment(state, payload: number) {
					state.value = state.value + payload
				},
			},
		})

		const store = manager.get(count)
		expect(store.$state()).toEqual({ value: 1 })
		store.increment(1)
		expect(store.$state()).toEqual({ value: 2 })
	})
	test('depends will be initial auto', () => {
		manager = redox()
		const depend = defineModel({
			name: 'depend',
			state: { depend: 0 },
			reducers: {
				increment(state, payload: number) {
					state.depend = state.depend + payload
				},
			},
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
				effects: {
					dependAdd() {
						this.$dep.depend.increment(1)
					},
				},
			},
			[depend]
		)

		const store = manager.get(count)
		store.dependAdd()
		expect(manager.getChangedState()).toEqual({ depend: { depend: 1 } })
	})

	test('getChangedState only collect changed state', () => {
		manager = redox()
		const count0 = defineModel({
			name: 'count0',
			state: { value: 0 },
			reducers: {
				increment(state, payload: number) {
					state.value = state.value + payload
				},
			},
		})
		const count1 = defineModel({
			name: 'count1',
			state: { value: 0 },
			reducers: {
				increment(state, payload: number) {
					state.value = state.value + payload
				},
			},
		})

		const store0 = manager.get(count0)
		const store1 = manager.get(count1)
		expect(store0.$state()).toEqual({ value: 0 })
		expect(store1.$state()).toEqual({ value: 0 })
		store0.increment(1)
		expect(manager.getChangedState()).toEqual({ count0: { value: 1 } })
	})

	test('destroy without error ', () => {
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
				effects: {
					useCount(_payload) {
						const countState = this.$dep.count.$state()
						this.add(countState.value.toString())
					},
				},
			},
			[other, count]
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
					async depends(_payload: string) {
						const domeState = this.$dep.dome.$state()
						this.$dep.other.add('use1 paly')
						this.$dep.other.add(domeState.toString())
						this.$dep.dome.add(1)
						this.$dep
						this.add(1)
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
		expect(manager.get(user).d()).toEqual({ number: 1 })
		expect(manager.get(user).one()).toEqual(1)
		expect(manager.get(user).s(2)).toEqual('state.id=>1, args=>2,views.one=>1')
		countStore.increment(1)
		domeStore.add(2)
		expect(manager.getChangedState()).toEqual({
			count: {
				value: 1,
			},
			dome: {
				number: 3,
			},
		})
		expect(manager.get(user).d()).toEqual({ number: 3 })
		expect(manager.get(user).one()).toEqual(3)
		expect(manager.get(user).s(undefined)).toEqual(
			'state.id=>1, args=>undefined,views.one=>3'
		)

		const otherCountStore = manager.get(otherCount)
		otherCountStore.useCount(undefined)

		expect(otherCountStore.$state()).toEqual(['1'])

		expect(() => {
			manager.destroy()
		}).not.toThrow()
	})

	describe('manager subscribes worked:', () => {
		beforeEach(() => {
			manager = redox()
		})
		test('subscribes and unsubscribes should work', () => {
			let firstCount = 0
			const first = defineModel({
				name: 'first',
				state: { value: 0 },
				reducers: {
					addOne: (state) => {
						return { value: state.value + 1 }
					},
				},
			})
			const firstStore = manager.get(first)
			manager.subscribe(first, () => {
				firstCount++
			})
			let secondCount = 0
			const second = defineModel({
				name: 'second',
				state: { value: 0 },
				reducers: {
					addOne: (state, payload: number) => ({
						value: state.value + payload,
					}),
				},
			})
			const secondStore = manager.get(second)
			const unSubscribeSecond = manager.subscribe(second, () => {
				secondCount++
			})

			firstStore.addOne()
			expect(firstCount).toBe(1)
			firstStore.addOne()
			expect(firstCount).toBe(2)
			expect(firstStore.$state()).toStrictEqual({ value: 2 })
			expect(secondStore.$state()).toStrictEqual({ value: 0 })

			secondStore.addOne(5)
			expect(secondCount).toBe(1)
			expect(secondStore.$state()).toStrictEqual({ value: 5 })

			unSubscribeSecond()
			secondStore.addOne(5)
			expect(secondCount).toBe(1)
		})
		test('depends store changed trigger beDepends listener', () => {
			let dependCount = 0
			let storeCount = 0
			const first = defineModel({
				name: 'first',
				state: { value: 0 },
				reducers: {
					addOne: (state) => {
						return { value: state.value + 1 }
					},
				},
			})
			const depend = manager.get(first)
			manager.subscribe(first, () => {
				console.log('dependCount: ', dependCount)
				dependCount++
			})
			const second = defineModel(
				{
					name: 'second',
					state: { value: 0 },
					reducers: {
						addOne: (state, payload: number) => ({
							value: state.value + payload,
						}),
					},
				},
				[first]
			)

			const store = manager.get(second)
			manager.subscribe(second, () => {
				storeCount++
			})

			depend.addOne()
			expect(dependCount).toBe(1)
			expect(storeCount).toBe(1)
			depend.addOne()
			expect(dependCount).toBe(2)
			expect(storeCount).toBe(2)
			store.addOne(1)
			expect(dependCount).toBe(2)
			expect(storeCount).toBe(3)
		})
	})
})
