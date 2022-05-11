/**
 * @jest-environment jsdom
 */

import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { defineModel, redox } from '@shuvi/redox'
import { act } from 'react-dom/test-utils'
import { useModel, RedoxRoot, useRootModel } from '../src'

const countModel = defineModel({
	name: 'countModel',
	state: {
		value: 1,
		value1: 1,
	},
	reducers: {
		addValue(state) {
			return {
				...state,
				value: state.value + 1,
			}
		},
		addValue1(state) {
			return {
				...state,
				value1: state.value1 + 1,
			}
		},
	},
	views: {
		test(args: number) {
			return this.value + args
		},
	},
})

let node: HTMLDivElement
beforeEach(() => {
	node = document.createElement('div')
	document.body.appendChild(node)
})

afterEach(() => {
	document.body.removeChild(node)
	;(node as unknown as null) = null
})

describe('batchedUpdates worked:', () => {
	test('once store change, update should batch in one time render', () => {
		let AppRenderCount = 0

		function App() {
			AppRenderCount += 1
			const [{ value: globalValue }, { addValue: globalAddValue }] =
				useRootModel(countModel)
			const [{ value }, { addValue }] = useModel(countModel)
			const [{ value1 }, { addValue1 }] = useModel(countModel)

			return (
				<>
					<div id="value">{`${globalValue}${value}${value1}`}</div>
					<div
						id="button"
						onClick={() => {
							globalAddValue()
							addValue()
							addValue1()
						}}
					>
						trigger actions
					</div>
				</>
			)
		}

		act(() => {
			ReactDOM.render(
				<RedoxRoot>
					<App />
				</RedoxRoot>,
				node
			)
		})

		expect(AppRenderCount).toBe(1)

		act(() => {
			node
				.querySelector('#button')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		expect(AppRenderCount).toBe(2)
	})

	test('it can trigger component render outside of component', () => {
		let AppRenderCount = 0

		function App() {
			AppRenderCount += 1
			const [{ value: globalValue }, _] = useRootModel(countModel)

			return (
				<>
					<div id="value">{`${globalValue}`}</div>
					<div id="button">trigger actions</div>
				</>
			)
		}

		const modelManager = redox()

		act(() => {
			ReactDOM.render(
				<RedoxRoot modelManager={modelManager}>
					<App />
				</RedoxRoot>,
				node
			)
		})

		expect(AppRenderCount).toBe(1)

		const countStore = modelManager.get(countModel)

		countStore.addValue()

		expect(AppRenderCount).toBe(2)
	})

	test('unsubscribe component render should is auto when component unmount', () => {
		let AppRenderCount = 0

		function SubApp() {
			AppRenderCount += 1
			const [{ value: globalValue }, { addValue: globalAddValue }] =
				useRootModel(countModel)

			return (
				<>
					<div id="value">{`${globalValue}`}</div>
					<div
						id="button"
						onClick={() => {
							globalAddValue()
						}}
					>
						trigger actions
					</div>
				</>
			)
		}

		function App() {
			const [state, setState] = React.useState(1)

			return (
				<>
					<div
						id="button"
						onClick={() => {
							setState(0)
						}}
					>
						trigger actions
					</div>
					{state ? <SubApp /> : null}
				</>
			)
		}

		const modelManager = redox()

		act(() => {
			ReactDOM.render(
				<RedoxRoot modelManager={modelManager}>
					<App />
				</RedoxRoot>,
				node
			)
		})

		expect(AppRenderCount).toBe(1)

		act(() => {
			node
				.querySelector('#button')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		const countStore = modelManager.get(countModel)
		countStore.addValue()
		expect(AppRenderCount).toBe(1)
	})

	test('component should render when other component unmount', () => {
		function SubApp() {
			const [{ value }, { addValue }] = useRootModel(countModel)

			return (
				<>
					<div id="sub-value">{`${value}`}</div>
					<div
						id="sub-button"
						onClick={() => {
							addValue()
						}}
					>
						trigger actions
					</div>
				</>
			)
		}

		function App() {
			const [state, setState] = React.useState(1)
			const [{ value }, { addValue }] = useRootModel(countModel)
			return (
				<>
					<div id="app-value">{`${value}`}</div>
					<div
						id="app-button"
						onClick={() => {
							addValue()
						}}
					>
						trigger actions
					</div>
					<div
						id="button-remove-sub"
						onClick={() => {
							setState(0)
						}}
					>
						trigger actions
					</div>
					{state ? <SubApp /> : null}
				</>
			)
		}

		const modelManager = redox()

		act(() => {
			ReactDOM.render(
				<RedoxRoot modelManager={modelManager}>
					<App />
				</RedoxRoot>,
				node
			)
		})

		expect(node.querySelector('#sub-value')?.innerHTML).toEqual('1')
		expect(node.querySelector('#app-value')?.innerHTML).toEqual('1')

		act(() => {
			node
				.querySelector('#button-remove-sub')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})

		expect(node.querySelector('#sub-value')?.innerHTML).toEqual(undefined)
		expect(node.querySelector('#app-value')?.innerHTML).toEqual('1')

		act(() => {
			node
				.querySelector('#app-button')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})

		expect(node.querySelector('#sub-value')?.innerHTML).toEqual(undefined)
		expect(node.querySelector('#app-value')?.innerHTML).toEqual('2')
	})

	test('selector and shadowEqual with return state can reduce the rerender times', () => {
		let renderCount = 0

		function App() {
			renderCount += 1
			const [{ value }, { addValue1 }] = useRootModel(
				countModel,
				(stateAndViews) => {
					return {
						value: stateAndViews.value,
					}
				}
			)

			return (
				<div>
					<div id="value">value:{value}</div>
					<button
						id="button1"
						onClick={() => {
							addValue1()
						}}
					>
						addValue1
					</button>
				</div>
			)
		}

		const modelManager = redox()
		act(() => {
			ReactDOM.render(
				<RedoxRoot modelManager={modelManager}>
					<App />
				</RedoxRoot>,
				node
			)
		})

		expect(renderCount).toBe(1)

		expect(node.querySelector('#value')?.innerHTML).toEqual('value:1')

		act(() => {
			node
				.querySelector('#button1')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})

		expect(modelManager.get(countModel).$state().value1).toBe(2)

		expect(renderCount).toBe(1)
	})

	test('depends rendered beDepend should render too', () => {
		let parentRenderCount = 0
		let childRenderCount = 0

		const appModel = defineModel(
			{
				name: 'appModel',
				state: {
					value: 2,
				},
				reducers: {},
				views: {
					// for test depend changed
					test() {
						return this.$dep.countModel.value * 2
					},
				},
			},
			[countModel]
		)

		function SubApp() {
			childRenderCount += 1

			const [{ value }, { addValue }] = useRootModel(countModel)

			return (
				<>
					<div id="value">value:{value}</div>
					<button
						id="button"
						onClick={() => {
							addValue()
						}}
					>
						addValue
					</button>
				</>
			)
		}

		function App() {
			parentRenderCount += 1
			const [{ test }, _] = useRootModel(appModel, function (stateAndViews) {
				return {
					test: stateAndViews.test(),
				}
			})

			return (
				<div>
					<div id="test">test:{test}</div>
					<SubApp />
				</div>
			)
		}

		act(() => {
			ReactDOM.render(
				<RedoxRoot>
					<App />
				</RedoxRoot>,
				node
			)
		})

		expect(parentRenderCount).toBe(1)
		expect(childRenderCount).toBe(1)

		expect(node.querySelector('#test')?.innerHTML).toEqual('test:2')
		expect(node.querySelector('#value')?.innerHTML).toEqual('value:1')

		act(() => {
			node
				.querySelector('#button')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		expect(parentRenderCount).toBe(2)
		expect(childRenderCount).toBe(2)
		expect(node.querySelector('#test')?.innerHTML).toEqual('test:4')
		expect(node.querySelector('#value')?.innerHTML).toEqual('value:2')
	})

	test('depends model case render depend and beDepend subscribe component should batch in one time render', () => {
		let parentRenderCount = 0
		let childRenderCount = 0

		const appModel = defineModel(
			{
				name: 'appModel',
				state: {
					value: 2,
				},
				reducers: {
					add(state) {
						state.value += 1
					},
				},
				actions: {
					makeCall() {
						this.$dep.countModel.addValue() // depend case appModel render
						this.add()
					},
				},
			},
			[countModel]
		)

		function SubApp() {
			childRenderCount++
			const [{ value }, _] = useRootModel(countModel)

			return (
				<>
					<div id="SubApp">{value}</div>
				</>
			)
		}

		function App() {
			parentRenderCount += 1
			const [{ value }, { makeCall }] = useRootModel(appModel)

			return (
				<div>
					<div id="App">{value}</div>
					<button
						id="button"
						onClick={() => {
							makeCall()
						}}
					>
						addValue
					</button>
					<SubApp />
				</div>
			)
		}

		act(() => {
			ReactDOM.render(
				<RedoxRoot>
					<App />
				</RedoxRoot>,
				node
			)
		})

		expect(parentRenderCount).toBe(1)
		expect(childRenderCount).toBe(1)

		expect(node.querySelector('#SubApp')?.innerHTML).toEqual('1')
		expect(node.querySelector('#App')?.innerHTML).toEqual('2')

		act(() => {
			node
				.querySelector('#button')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		expect(parentRenderCount).toBe(2)
		expect(childRenderCount).toBe(2)
		expect(node.querySelector('#SubApp')?.innerHTML).toEqual('2')
		expect(node.querySelector('#App')?.innerHTML).toEqual('3')
	})
})
