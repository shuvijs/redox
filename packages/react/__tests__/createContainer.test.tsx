/**
 * @jest-environment jsdom
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
// @ts-ignore
import { act } from 'react-dom/test-utils'
import { defineModel, redox, IPlugin } from '@shuvi/redox'
import {
	createContainer,
	RedoxRoot,
	useRootStaticModel,
	useRootModel,
} from '../src'

import { countModel } from './models'

let container: HTMLDivElement
beforeEach(() => {
	process.env.NODE_ENV = 'development'
	jest.useFakeTimers()
	container = document.createElement('div')
	document.body.appendChild(container)
})

afterEach(() => {
	document.body.removeChild(container)
	;(container as unknown as null) = null
})

describe('createContainer', () => {
	test('createContainer should return RedoxRoot and useSharedModel, useRootStaticModel', () => {
		const {
			Provider: _Provider,
			useSharedModel: _useSharedModel,
			useStaticModel: _useStaticModel,
		} = createContainer()

		expect(_Provider).toBeTruthy()
		expect(_useSharedModel).toBeTruthy()
		expect(_useStaticModel).toBeTruthy()
	})

	test('createContainer should accept redox argument', () => {
		const onInit = jest.fn()
		const onModel = jest.fn()
		const onStoreCreated = jest.fn()
		const onDestroy = jest.fn()
		const plugin: IPlugin = () => {
			return {
				onInit,
				onModel,
				onStoreCreated,
				onDestroy,
			}
		}

		let initialState = {}

		const { Provider: LocalProvider, useSharedModel } = createContainer({
			initialState,
			plugins: [[plugin, {}]],
		})

		const SubApp = () => {
			const [_state] = useSharedModel(countModel)

			return null
		}

		act(() => {
			ReactDOM.createRoot(container).render(
				<LocalProvider>
					<SubApp />
				</LocalProvider>
			)
		})

		expect(onInit).toHaveBeenCalled()
		expect(onModel).toHaveBeenCalled()
		expect(typeof onStoreCreated.mock.calls[0][0].dispatch).toBe('function')
	})

	test('Local RedoxRoot and useSharedModel should work', () => {
		const { Provider: LocalProvider, useSharedModel } = createContainer()

		const SubApp = () => {
			const [state, actions] = useSharedModel(countModel)

			return (
				<>
					<div id="state">{state.value}</div>
					<button id="button" type="button" onClick={() => actions.add()}>
						add
					</button>
				</>
			)
		}

		act(() => {
			ReactDOM.createRoot(container).render(
				<LocalProvider>
					<SubApp />
				</LocalProvider>
			)
		})

		expect(container.querySelector('#state')?.innerHTML).toEqual('1')
		act(() => {
			container
				.querySelector('#button')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		expect(container.querySelector('#state')?.innerHTML).toEqual('2')
	})

	test('nest useSharedModel should get it own context', () => {
		const { Provider: LocalProviderA, useSharedModel: useSharedModelA } =
			createContainer()
		const { Provider: LocalProviderB, useSharedModel: useSharedModelB } =
			createContainer()

		const C = () => {
			const [stateA, _actionsA] = useSharedModelA(countModel)
			const [stateB, _actionsB] = useSharedModelB(countModel)

			return (
				<>
					<div id="stateCA">{stateA.value}</div>
					<div id="stateCB">{stateB.value}</div>
				</>
			)
		}

		const A = () => {
			const [state, actions] = useSharedModelA(countModel)

			return (
				<>
					<div id="stateA">{state.value}</div>
					<button id="buttonA" type="button" onClick={() => actions.add()}>
						add
					</button>
					<C></C>
				</>
			)
		}

		const B = () => {
			const [state, actions] = useSharedModelB(countModel)

			return (
				<>
					<div id="stateB">{state.value}</div>
					<button id="buttonB" type="button" onClick={() => actions.add()}>
						add
					</button>
					<C></C>
				</>
			)
		}

		act(() => {
			ReactDOM.createRoot(container).render(
				<LocalProviderA>
					<LocalProviderB>
						<A></A>
						<B></B>
					</LocalProviderB>
				</LocalProviderA>
			)
		})

		expect(container.querySelector('#stateA')?.innerHTML).toEqual('1')
		expect(container.querySelector('#stateB')?.innerHTML).toEqual('1')
		expect(container.querySelector('#stateCA')?.innerHTML).toEqual('1')
		expect(container.querySelector('#stateCB')?.innerHTML).toEqual('1')
		act(() => {
			container
				.querySelector('#buttonA')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		expect(container.querySelector('#stateA')?.innerHTML).toEqual('2')
		expect(container.querySelector('#stateB')?.innerHTML).toEqual('1')
		expect(container.querySelector('#stateCA')?.innerHTML).toEqual('2')
		expect(container.querySelector('#stateCB')?.innerHTML).toEqual('1')
	})

	test('each container should be isolation', () => {
		const { Provider: LocalProviderA, useSharedModel: useSharedModelA } =
			createContainer()

		const A = (props: { id: number }) => {
			const [state, actions] = useSharedModelA(countModel)

			return (
				<>
					<div id={`stateA${props.id}`}>{state.value}</div>
					<button
						id={`buttonA${props.id}`}
						type="button"
						onClick={() => actions.add()}
					>
						add
					</button>
				</>
			)
		}

		const Warp = function (props: { id: number }) {
			return (
				<LocalProviderA>
					<A {...props}></A>
				</LocalProviderA>
			)
		}

		act(() => {
			ReactDOM.createRoot(container).render(
				<>
					<Warp id={1}></Warp>
					<Warp id={2}></Warp>
				</>
			)
		})

		expect(container.querySelector('#stateA1')?.innerHTML).toEqual('1')
		expect(container.querySelector('#stateA2')?.innerHTML).toEqual('1')
		act(() => {
			container
				.querySelector('#buttonA1')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		expect(container.querySelector('#stateA1')?.innerHTML).toEqual('2')
		expect(container.querySelector('#stateA2')?.innerHTML).toEqual('1')
	})

	test('different containers share same storeManager should has same state', () => {
		const storeManager = redox()
		const { Provider: LocalProviderA, useSharedModel: useSharedModelA } =
			createContainer()
		const { Provider: LocalProviderB, useSharedModel: useSharedModelB } =
			createContainer()

		const C = () => {
			const [stateA, _actionsA] = useSharedModelA(countModel)
			const [stateB, _actionsB] = useSharedModelB(countModel)

			return (
				<>
					<div id="stateCA">{stateA.value}</div>
					<div id="stateCB">{stateB.value}</div>
				</>
			)
		}

		const A = () => {
			const [state, actions] = useSharedModelA(countModel)

			return (
				<>
					<div id="stateA">{state.value}</div>
					<button id="buttonA" type="button" onClick={() => actions.add()}>
						add
					</button>
					<C></C>
				</>
			)
		}

		const B = () => {
			const [state, actions] = useSharedModelB(countModel)

			return (
				<>
					<div id="stateB">{state.value}</div>
					<button id="buttonB" type="button" onClick={() => actions.add()}>
						add
					</button>
					<C></C>
				</>
			)
		}

		act(() => {
			ReactDOM.createRoot(container).render(
				<LocalProviderA storeManager={storeManager}>
					<LocalProviderB storeManager={storeManager}>
						<A></A>
						<B></B>
					</LocalProviderB>
				</LocalProviderA>
			)
		})

		expect(container.querySelector('#stateA')?.innerHTML).toEqual('1')
		expect(container.querySelector('#stateB')?.innerHTML).toEqual('1')
		expect(container.querySelector('#stateCA')?.innerHTML).toEqual('1')
		expect(container.querySelector('#stateCB')?.innerHTML).toEqual('1')
		act(() => {
			container
				.querySelector('#buttonA')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		expect(container.querySelector('#stateA')?.innerHTML).toEqual('2')
		expect(container.querySelector('#stateB')?.innerHTML).toEqual('2')
		expect(container.querySelector('#stateCA')?.innerHTML).toEqual('2')
		expect(container.querySelector('#stateCB')?.innerHTML).toEqual('2')
	})

	test('storeManager can exist independently wether the component is unmount', () => {
		const { Provider: LocalProvider, useSharedModel } = createContainer()

		const SubApp = () => {
			const [state, actions] = useSharedModel(countModel)

			return (
				<>
					<div id="state">{state.value}</div>
					<button id="button" type="button" onClick={() => actions.add()}>
						add
					</button>
				</>
			)
		}

		const storeManager = redox()

		const App = () => {
			const [toggle, setToggle] = React.useState(true)
			return (
				<>
					<button id="toggle" type="button" onClick={() => setToggle(!toggle)}>
						add
					</button>
					{toggle ? (
						<LocalProvider storeManager={storeManager}>
							<SubApp />
						</LocalProvider>
					) : null}
				</>
			)
		}

		act(() => {
			ReactDOM.createRoot(container).render(<App></App>)
		})

		expect(container.querySelector('#state')?.innerHTML).toEqual('1')
		act(() => {
			container
				.querySelector('#button')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		expect(container.querySelector('#state')?.innerHTML).toEqual('2')
		act(() => {
			container
				.querySelector('#toggle')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		storeManager.get(countModel).add(1)
	})

	test('container state should sync with storeManager', () => {
		const { Provider: LocalProvider, useSharedModel } = createContainer()

		const SubApp = () => {
			const [state, actions] = useSharedModel(countModel)

			return (
				<>
					<div id="state">{state.value}</div>
					<button id="button" type="button" onClick={() => actions.add()}>
						add
					</button>
				</>
			)
		}

		const storeManager0 = redox()
		const storeManager1 = redox()

		const App = () => {
			const [toggle, setToggle] = React.useState(true)
			return (
				<>
					<button id="toggle" type="button" onClick={() => setToggle(!toggle)}>
						toggle
					</button>
					<LocalProvider storeManager={toggle ? storeManager0 : storeManager1}>
						<SubApp />
					</LocalProvider>
				</>
			)
		}

		act(() => {
			ReactDOM.createRoot(container).render(<App></App>)
		})

		expect(container.querySelector('#state')?.innerHTML).toEqual('1')
		act(() => {
			container
				.querySelector('#button')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		expect(container.querySelector('#state')?.innerHTML).toEqual('2')
		act(() => {
			container
				.querySelector('#toggle')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		expect(container.querySelector('#state')?.innerHTML).toEqual('1')
		act(() => {
			container
				.querySelector('#toggle')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		expect(container.querySelector('#state')?.innerHTML).toEqual('2')
	})
})

describe('createContainer/RedoxRoot', () => {
	test('RedoxRoot should worked without props storeManager', () => {
		const App = () => {
			const [state, actions] = useRootModel(countModel)
			return (
				<>
					<div id="value">{state.value}</div>
					<button id="button" type="button" onClick={() => actions.add()}>
						add
					</button>
				</>
			)
		}

		act(() => {
			ReactDOM.createRoot(container).render(
				<RedoxRoot>
					<App />
				</RedoxRoot>
			)
		})

		expect(container.querySelector('#value')?.innerHTML).toEqual('1')
		act(() => {
			container
				.querySelector('#button')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		expect(container.querySelector('#value')?.innerHTML).toEqual('2')
	})

	test('RedoxRoot props storeManager could overwrite default storeManager', () => {
		const App = () => {
			const [state] = useRootModel(countModel)
			return (
				<>
					<div id="value">{state.value}</div>
				</>
			)
		}

		const storeManager = redox({
			initialState: {
				countModel: {
					value: 2,
				},
			},
		})

		act(() => {
			ReactDOM.createRoot(container).render(
				<RedoxRoot storeManager={storeManager}>
					<App />
				</RedoxRoot>
			)
		})

		expect(container.querySelector('#value')?.innerHTML).toEqual('2')
	})
})

describe('createContainer/useRootModel', () => {
	describe('valid', () => {
		test('name should be required', async () => {
			const tempModel = defineModel({
				state: {
					value: 1,
				},
				reducers: {
					add(state, payload: number = 1) {
						state.value += payload
					},
				},
			})

			const App = () => {
				const [state, actions] = useRootModel(tempModel)

				return (
					<>
						<div id="value">{state.value}</div>
						<button id="button" type="button" onClick={() => actions.add()}>
							add
						</button>
					</>
				)
			}

			expect(() => {
				act(() => {
					ReactDOM.createRoot(container).render(
						<RedoxRoot>
							<App />
						</RedoxRoot>
					)
				})
			}).toThrow()
		})

		test('name should not be empty', async () => {
			const tempModel = defineModel({
				name: '',
				state: {
					value: 1,
				},
				reducers: {
					add(state, payload: number = 1) {
						state.value += payload
					},
				},
			})

			const App = () => {
				const [state, actions] = useRootModel(tempModel)

				return (
					<>
						<div id="value">{state.value}</div>
						<button id="button" type="button" onClick={() => actions.add()}>
							add
						</button>
					</>
				)
			}

			expect(() => {
				act(() => {
					ReactDOM.createRoot(container).render(
						<RedoxRoot>
							<App />
						</RedoxRoot>
					)
				})
			}).toThrow()
		})

		test('useRootModel should has parent RedoxRoot', async () => {
			const tempModel = defineModel({
				name: 'tempModel',
				state: {
					value: 1,
				},
				reducers: {
					add(state, payload: number = 1) {
						state.value += payload
					},
				},
			})

			const App = () => {
				const [state, actions] = useRootModel(tempModel)

				return (
					<>
						<div id="value">{state.value}</div>
						<button id="button" type="button" onClick={() => actions.add()}>
							add
						</button>
					</>
				)
			}

			expect(() => {
				act(() => {
					ReactDOM.createRoot(container).render(<App />)
				})
			}).toThrow()
		})
	})

	test('should keep state same ref in different component', async () => {
		let AppState: any = null
		let AppState1: any = null
		const App = () => {
			const [state, actions] = useRootModel(countModel)
			const [state1, _actions1] = useRootModel(countModel)
			AppState = state
			AppState1 = state1
			return (
				<>
					<div id="value">{state.value}</div>
					<button id="button" type="button" onClick={() => actions.add(1)}>
						add
					</button>
					<SubApp></SubApp>
				</>
			)
		}
		let SubAppState: any = null
		function SubApp() {
			const [state, _actions] = useRootModel(countModel)
			SubAppState = state
			return <></>
		}

		act(() => {
			ReactDOM.createRoot(container).render(
				<RedoxRoot>
					<App />
				</RedoxRoot>
			)
		})

		expect(container.querySelector('#value')?.innerHTML).toEqual('1')

		expect(AppState).toBeTruthy()
		expect(AppState === AppState1).toBeTruthy()
		expect(AppState === SubAppState).toBeTruthy()
		act(() => {
			container
				.querySelector('#button')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})

		expect(container.querySelector('#value')?.innerHTML).toEqual('2')
		expect(AppState === AppState1).toBeTruthy()
		expect(AppState === SubAppState).toBeTruthy()
	})

	test('should keep actions same ref', async () => {
		let AppActions: any = null
		let AppActions1: any = null
		const App = () => {
			const [state, actions] = useRootModel(countModel)
			const [_state1, actions1] = useRootModel(countModel)
			AppActions = actions
			AppActions1 = actions1
			return (
				<>
					<div id="value">{state.value}</div>
					<button id="button" type="button" onClick={() => actions.add(1)}>
						add
					</button>
					<SubApp></SubApp>
				</>
			)
		}
		let SubAppActions: any = null
		function SubApp() {
			const [_state, actions] = useRootModel(countModel)
			SubAppActions = actions
			return <></>
		}

		act(() => {
			ReactDOM.createRoot(container).render(
				<RedoxRoot>
					<App />
				</RedoxRoot>
			)
		})

		expect(container.querySelector('#value')?.innerHTML).toEqual('1')

		expect(AppActions).toBeTruthy()
		expect(AppActions === AppActions1).toBeTruthy()
		expect(AppActions === SubAppActions).toBeTruthy()
		act(() => {
			container
				.querySelector('#button')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})

		expect(container.querySelector('#value')?.innerHTML).toEqual('2')
		expect(AppActions === AppActions1).toBeTruthy()
		expect(AppActions === SubAppActions).toBeTruthy()
	})

	test("should keep data's state with component unmount or not", async () => {
		const SubApp = () => {
			const [state, actions] = useRootModel(countModel)

			return (
				<>
					<div id="state">{state.value}</div>
					<button id="button" type="button" onClick={() => actions.add()}>
						add
					</button>
				</>
			)
		}

		const App = () => {
			const [toggle, setToggle] = React.useState(true)
			return (
				<>
					<button id="toggle" type="button" onClick={() => setToggle(!toggle)}>
						add
					</button>
					{toggle ? <SubApp /> : null}
				</>
			)
		}

		act(() => {
			ReactDOM.createRoot(container).render(
				<RedoxRoot>
					<App></App>
				</RedoxRoot>
			)
		})

		expect(container.querySelector('#state')?.innerHTML).toEqual('1')
		act(() => {
			container
				.querySelector('#button')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		expect(container.querySelector('#state')?.innerHTML).toEqual('2')
		act(() => {
			container
				.querySelector('#toggle')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		expect(container.querySelector('#state')?.innerHTML).toEqual(undefined)
		act(() => {
			container
				.querySelector('#toggle')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		expect(container.querySelector('#state')?.innerHTML).toEqual('2')
	})
})

describe('createContainer/useRootStaticModel', () => {
	describe('valid', () => {
		test('name should be required', async () => {
			const tempModel = defineModel({
				state: {
					value: 1,
				},
				reducers: {
					add(state, payload: number = 1) {
						state.value += payload
					},
				},
			})

			const App = () => {
				const [state, actions] = useRootStaticModel(tempModel)

				return (
					<>
						<div id="value">{state.current.value}</div>
						<button id="button" type="button" onClick={() => actions.add()}>
							add
						</button>
					</>
				)
			}

			expect(() => {
				act(() => {
					ReactDOM.createRoot(container).render(
						<RedoxRoot>
							<App />
						</RedoxRoot>
					)
				})
			}).toThrow()
		})

		test('name should not be empty', async () => {
			const tempModel = defineModel({
				name: '',
				state: {
					value: 1,
				},
				reducers: {
					add(state, payload: number = 1) {
						state.value += payload
					},
				},
			})

			const App = () => {
				const [state, actions] = useRootStaticModel(tempModel)

				return (
					<>
						<div id="value">{state.current.value}</div>
						<button id="button" type="button" onClick={() => actions.add()}>
							add
						</button>
					</>
				)
			}

			expect(() => {
				act(() => {
					ReactDOM.createRoot(container).render(
						<RedoxRoot>
							<App />
						</RedoxRoot>
					)
				})
			}).toThrow()
		})

		test('useRootStaticModel should has parent RedoxRoot', async () => {
			const tempModel = defineModel({
				name: 'tempModel',
				state: {
					value: 1,
				},
				reducers: {
					add(state, payload: number = 1) {
						state.value += payload
					},
				},
			})

			const App = () => {
				const [state, actions] = useRootStaticModel(tempModel)

				return (
					<>
						<div id="value">{state.current.value}</div>
						<button id="button" type="button" onClick={() => actions.add()}>
							add
						</button>
					</>
				)
			}

			expect(() => {
				act(() => {
					ReactDOM.createRoot(container).render(<App />)
				})
			}).toThrow()
		})
	})

	test('state updated, but component should not rendered', () => {
		let renderTime = 0
		let currentCount = 0

		const StaticApp = () => {
			renderTime += 1

			const [state, dispatch] = useRootStaticModel(countModel)

			currentCount = state.current.value

			return (
				<>
					<div id="state">{state.current.value}</div>
					<button id="add" type="button" onClick={() => dispatch.add()}>
						add
					</button>
					<button
						id="updateCount"
						type="button"
						onClick={() => {
							currentCount = state.current.value
						}}
					>
						updateCount
					</button>
				</>
			)
		}

		act(() => {
			ReactDOM.createRoot(container).render(
				<RedoxRoot>
					<StaticApp />
				</RedoxRoot>
			)
		})

		expect(renderTime).toBe(1)
		expect(currentCount).toBe(1)

		act(() => {
			container
				.querySelector('#add')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})

		expect(renderTime).toBe(1)
		expect(currentCount).toBe(1)

		act(() => {
			container
				.querySelector('#updateCount')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		expect(currentCount).toBe(2)
	})

	test('should state keep same ref in one component', () => {
		let stateRef: any
		let stateRef1: any

		const StaticApp = () => {
			const [state, dispatch] = useRootStaticModel(countModel)
			const [_, setValue] = React.useState(false)

			if (!stateRef) {
				stateRef = state
			}

			stateRef1 = state

			return (
				<>
					<div id="state">{state.current.value}</div>
					<button
						id="add"
						type="button"
						onClick={() => {
							dispatch.add()
							setValue(true)
						}}
					>
						add
					</button>
				</>
			)
		}

		act(() => {
			ReactDOM.createRoot(container).render(
				<RedoxRoot>
					<StaticApp />
				</RedoxRoot>
			)
		})

		act(() => {
			container
				.querySelector('#add')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})

		expect(stateRef === stateRef1).toBeTruthy()
	})
})
