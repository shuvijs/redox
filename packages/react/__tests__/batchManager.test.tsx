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
	test('once store change, update should batch in one render', () => {
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
	test('trigger component render outside of component', () => {
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

	test('unsubscribe component render auto when component unmount', () => {
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

	test('depends update beDepend should update', () => {
		let parentRenderCount = 0
		let childRenderCount = 0

		const appModel = defineModel(
			{
				name: 'appModel',
				state: {
					value: 2,
				},
				reducers: {
					addValue(state) {
						return {
							...state,
							value: state.value * 10,
						}
					},
				},
				views: {
					test(state, dependsState): number {
						return state.value + dependsState.countModel.value
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
			const [{ value }, { addValue }] = useGlobalModel(appModel)

			return (
				<div>
					<div id="test">test:{value}</div>
					<button onClick={() => addValue()}>addValue</button>
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

		expect(node.querySelector('#test')?.innerHTML).toEqual('test:1')
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

	test('selector will reduce the rerender times', () => {
		let renderCount = 0

		function App() {
			renderCount += 1
			const [{ value, test }, { addValue, addValue1 }] = useModel(
				countModel,
				(state, views) => {
					return {
						test: views.test(3),
						value: state.value,
					}
				}
			)
			const [index, setIndex] = React.useState(0)

			return (
				<div>
					<div id="index">index:{index}</div>
					<div id="value">value:{value}</div>
					<div id="test">test:{test}</div>
					<div id="test1">test1:{test1}</div>
					<button id="index-button" onClick={() => setIndex(1)}>
						setIndex
					</button>
					<button id="button" onClick={() => addValue()}>
						addValue
					</button>
					<button id="button1" onClick={() => addValue1()}>
						addValue1
					</button>
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

		expect(renderCount).toBe(1)
		expect(computed).toBe(1)

		expect(node.querySelector('#index')?.innerHTML).toEqual('index:0')
		expect(node.querySelector('#value')?.innerHTML).toEqual('value:1')
		expect(node.querySelector('#test')?.innerHTML).toEqual('test:4')
		expect(node.querySelector('#test1')?.innerHTML).toEqual('test1:5')

		act(() => {
			node
				.querySelector('#index-button')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})

		expect(renderCount).toBe(2)
		expect(computed).toBe(1)

		expect(node.querySelector('#index')?.innerHTML).toEqual('index:1')
		expect(node.querySelector('#value')?.innerHTML).toEqual('value:1')
		expect(node.querySelector('#test')?.innerHTML).toEqual('test:4')
		expect(node.querySelector('#test1')?.innerHTML).toEqual('test1:5')

		act(() => {
			node
				.querySelector('#button')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})

		expect(renderCount).toBe(3)
		expect(computed).toBe(2)

		expect(node.querySelector('#index')?.innerHTML).toEqual('index:1')
		expect(node.querySelector('#value')?.innerHTML).toEqual('value:2')
		expect(node.querySelector('#test')?.innerHTML).toEqual('test:5')
		expect(node.querySelector('#test1')?.innerHTML).toEqual('test1:6')

		act(() => {
			node
				.querySelector('#button1')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})

		expect(renderCount).toBe(3)
		expect(computed).toBe(3)

		expect(node.querySelector('#index')?.innerHTML).toEqual('index:1')
		expect(node.querySelector('#value')?.innerHTML).toEqual('value:2')
		expect(node.querySelector('#test')?.innerHTML).toEqual('test:5')
	})
})
