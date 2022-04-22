/**
 * @jest-environment jsdom
 */

import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { defineModel, redox } from '@shuvi/redox'
import { act } from 'react-dom/test-utils'
import { useModel, Provider, useGlobalModel } from '../src'

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
		test(state, _dependsState, args): number {
			return state.value + args
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
				useGlobalModel(countModel)
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
				<Provider>
					<App />
				</Provider>,
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
			const [{ value: globalValue }, _] = useGlobalModel(countModel)

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
				<Provider modelManager={modelManager}>
					<App />
				</Provider>,
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
				useGlobalModel(countModel)

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
				<Provider modelManager={modelManager}>
					<App />
				</Provider>,
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

	test('selector and shadowEqual with return state can reduce the rerender times', () => {
		let renderCount = 0

		function App() {
			renderCount += 1
			const [{ value }, { addValue1 }] = useGlobalModel(
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
				<Provider modelManager={modelManager}>
					<App />
				</Provider>,
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
					test(_s, dependState) {
						return dependState.countModel.value * 2
					},
				},
			},
			[countModel]
		)

		function SubApp() {
			childRenderCount += 1

			const [{ value }, { addValue }] = useGlobalModel(countModel)

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
			const [{ test }, _] = useGlobalModel(appModel, function (stateAndViews) {
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
				<Provider>
					<App />
				</Provider>,
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
})
