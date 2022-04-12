import { defineModel, redox } from '../../src'
let manager: ReturnType<typeof redox>
describe('circular references', () => {
	beforeEach(() => {
		manager = redox()
	})
	it("shouldn't throw error accessing rootState in effects with a return value", () => {
		type ComplexTypeIds = {
			[key: string]: boolean
		}
		type ComplexType = {
			ids: ComplexTypeIds
		}
		const model = defineModel({
			name: 'model',
			state: {
				ids: {},
			} as ComplexType,
			reducers: {
				b(state){
					return state
				}
			},
			effects: {
				async a(
					payload: { name: string },
					model
					// the key is defining the Promise<boolean>
				): Promise<boolean> {
					const id = model.ids[payload.name]
					return id
				},
			},
			views:{
				e(_state, _dependsState, args: number){
					return 1 + args
				},
				m(_state, _dependsState, _args?: {name: string}){
					return 'f';
				},
				f(): string{
					return 'f';
				}
			}
		})
		const otherModel = defineModel({
			name: 'otherModel',
			state: {
				a: {
					b: {} as Record<string, string>,
					c: 1,
				},
			},
			reducers: {},
			effects: {
				async b(payload: { name: string }, otherModel) {
					const id = otherModel.a.b[payload.name]
					return id
				},
			},
		})

		const store = manager.get(model)

		store.dispatch({type: 'b'})
		store.dispatch.a({name: '111'})
		store.dispatch.b()
		const b = store.getState();
		store.views.e(1);
		store.views.m();
		store.views.f();
		b.ids;

		const store1 = manager.get(otherModel)

		store1.dispatch.b({name: '111'})

		const b1 = store1.getState();
		store1.views;

		b1.a.c
	})

	it("has depends", () => {
		const other = defineModel({
			name: 'other',
			state: {
				other: ['other']
			},
			reducers: {
				add: (state, step: string) => {
					return {
						...state,
						other: [...state.other, step]
					};
				}
			},
			effects:{}
		});
		
		const dome = defineModel({
			name: 'dome',
			state: {
				number: 666
			},
			reducers: {
				domeAdd: (state, step: number) => {
					// return state;
					return {
						...state,
						number: state.number + step
					};
				}
			},
		});
		
		const user = defineModel(
			{
				name: 'user1',
				state: {
					id: 1,
					name: 'haha'
				},
				reducers: {
					add: (state, step) => {
						return {
							...state,
							id: state.id + step
						};
					}
				},
				effects: {
					async depends(_payload: string, _state, depends) {
						console.log('depends: ', depends);
						const { getState, dispatch } = depends;
						const dependsState = getState();
						dependsState.other
						dependsState.dome
						dispatch.other({type: 'add'})
						dispatch.other.add('string')
						// dispatch.other.b('string')
						// dispatch.other.b1('string')
						dispatch.dome({type: 'domeAdd'})
						dispatch.dome.domeAdd(1)
						// dispatch.dome.domeAdd1(1)
					}
				},
				views: {
					a() {
						return 'dependsState.dome';
					},
					d (state, dependsState): {number: number} {
						console.log(state.id);
						const a = dependsState.other;
						console.log(dependsState.dome.number);
						console.log(a.other[0]);
						console.log('d computed');
						return dependsState.dome;
					},
					one (_state, dependsState, _args: string): number{
						return dependsState.dome.number;
					},
					one1(_state, dependsState, _args?: string): number{
						return dependsState.dome.number;
					},
					two (_state, dependsState, _args: unknown): number{
						return dependsState.dome.number;
					},
					double (state, _dependsState, args): string {
						// console.log('views', state, rootState, views, args);
						// console.log('this', this)
						// console.log('this', views.one)
						// return state.id * args;
						console.log('double computed');
						return `state.id=>${state.id}, args=>${args},views.one=>${this.one}`;
					}
				}
			},
			[ other, dome ]
		);
		manager.get(user).views

	})
})
