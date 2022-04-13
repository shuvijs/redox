import { defineModel, redox } from '../src'
let manager: ReturnType<typeof redox>

describe('subscribes:', () => {
	beforeEach(() => {
		manager = redox()
	})
	test('should work', () => {
		let firstCount = 0;
		const first = defineModel({
			name: 'first',
			state: { value: 0 },
			reducers: {
				addOne: (state) => {
					return {value: state.value + 1}
				}
			}
		});
		const firstStore = manager.get(first);
		firstStore.subscribe(()=>{
			firstCount++;
		})
		let secondCount = 0;
		const second = defineModel({
			name: 'second',
			state: { value: 0 },
			reducers: {
				addOne: (state, payload: number) => ({value: state.value + payload})
			},
		});
		const secondStore = manager.get(second)
		const unSubscribeSecond = secondStore.subscribe(() => {
			secondCount++;
		})

		firstStore.dispatch.addOne();
		expect(firstCount).toBe(1);
		firstStore.dispatch({ type: 'addOne' });
		expect(firstCount).toBe(2);
		expect(firstStore.getState()).toStrictEqual({value: 2});
		expect(secondStore.getState()).toStrictEqual({value: 0});

		const secondAction = { type: 'addOne', payload: 5 }
		secondStore.dispatch(secondAction);
		expect(secondCount).toBe(1);
		expect(secondStore.getState()).toStrictEqual({value: 5});

		unSubscribeSecond()
		secondStore.dispatch(secondAction);
		expect(secondCount).toBe(1);
	})
	test('depends store changed trigger beDepends listener', () => {
		let dependCount = 0;
		let storeCount = 0;
		const first = defineModel({
			name: 'first',
			state: { value: 0 },
			reducers: {
				addOne: (state) => {
					return {value: state.value + 1}
				}
			}
		});
		const depend = manager.get(first);
		depend.subscribe(()=>{
			console.log('dependCount: ', dependCount);
			dependCount++;
		})
		const second = defineModel({
			name: 'second',
			state: { value: 0 },
			reducers: {
				addOne: (state, payload: number) => ({value: state.value + payload})
			},
		}, [ first ]);

		const store = manager.get(second);
		store.subscribe(() => {
			storeCount++;
		})

		depend.dispatch.addOne();
		expect(dependCount).toBe(1);
		expect(storeCount).toBe(1);
		depend.dispatch({ type: 'addOne' });
		expect(dependCount).toBe(2);
		expect(storeCount).toBe(2);
		store.dispatch.addOne(1)
		expect(dependCount).toBe(2);
		expect(storeCount).toBe(3);
	})
})
