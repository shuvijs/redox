/**
 * @jest-environment jsdom
 */

import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { act } from 'react-dom/test-utils'
import { useModel, Provider } from '../src'
import { countModel, stepModel, sleep } from './models'

describe('test useModel', () => {
	let node: HTMLDivElement
	beforeEach(() => {
		node = document.createElement('div')
		document.body.appendChild(node)
	})

	afterEach(() => {
		document.body.removeChild(node)
		;(node as unknown as null) = null
	})

	describe('reducers dispatch', () => {
		test('reducer without parameters', () => {
			function App() {
				const [{ step }, { addOneStep }] = useModel(stepModel)
				return (
					<div>
						<div id="step">step:{step}</div>
						<div id="button" onClick={() => addOneStep()}>
							addValue
						</div>
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
			expect(node.querySelector('#step')?.innerHTML).toEqual('step:1')
			act(() => {
				node
					.querySelector('#button')
					?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
			})
			expect(node.querySelector('#step')?.innerHTML).toEqual('step:2')
		})

		test('reducer with payload', () => {
			function App() {
				const [{ step }, { addStep }] = useModel(stepModel)
				return (
					<div>
						<div id="step">step:{step}</div>
						<div id="button" onClick={() => addStep(5)}>
							addValue
						</div>
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
			expect(node.querySelector('#step')?.innerHTML).toEqual('step:1')
			act(() => {
				node
					.querySelector('#button')
					?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
			})
			expect(node.querySelector('#step')?.innerHTML).toEqual('step:6')
		})

		test('reducer with payload and meta', () => {
			function App() {
				const [{ step }, { addStepByEffect }] = useModel(stepModel)
				return (
					<div>
						<div id="step">step:{step}</div>
						<div id="button" onClick={() => addStepByEffect(3)}>
							addValue
						</div>
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
			expect(node.querySelector('#step')?.innerHTML).toEqual('step:1')
			act(() => {
				node
					.querySelector('#button')
					?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
			})
			expect(node.querySelector('#step')?.innerHTML).toEqual('step:4')
		})
	})

	describe('effects dispatch without dependency models', () => {
		test('effect without parameters', () => {
			function App() {
				const [{ value }, { addValueByEffect }] = useModel(countModel)
				return (
					<div>
						<div id="addValue">value:{value}</div>
						<div id="button" onClick={() => addValueByEffect()}>
							addValue
						</div>
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
			expect(node.querySelector('#addValue')?.innerHTML).toEqual('value:1')
			act(() => {
				node
					.querySelector('#button')
					?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
			})
			expect(node.querySelector('#addValue')?.innerHTML).toEqual('value:2')
		})

		test('effect with payload', () => {
			function App() {
				const [{ value }, { addValueByEffectWithPaload }] = useModel(countModel)
				return (
					<div>
						<div id="addValue">value:{value}</div>
						<div id="button" onClick={() => addValueByEffectWithPaload(3)}>
							addValue
						</div>
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
			expect(node.querySelector('#addValue')?.innerHTML).toEqual('value:1')
			act(() => {
				node
					.querySelector('#button')
					?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
			})
			expect(node.querySelector('#addValue')?.innerHTML).toEqual('value:4')
		})

		test('effect with payload and meta', () => {
			function App() {
				const [{ value }, { addValueByEffectWithPaloadAndMeta }] =
					useModel(countModel)
				return (
					<div>
						<div id="addValue">value:{value}</div>
						<div
							id="button"
							onClick={() => addValueByEffectWithPaloadAndMeta(4)}
						>
							addValue
						</div>
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
			expect(node.querySelector('#addValue')?.innerHTML).toEqual('value:1')
			act(() => {
				node
					.querySelector('#button')
					?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
			})
			expect(node.querySelector('#addValue')?.innerHTML).toEqual('value:5')
		})

		test('async effect', async () => {
			function App() {
				const [{ value }, { addValueByEffectAsync }] = useModel(countModel)
				return (
					<div>
						<div id="addValue">value:{value}</div>
						<div id="button" onClick={() => addValueByEffectAsync()}>
							addValue
						</div>
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
			expect(node.querySelector('#addValue')?.innerHTML).toEqual('value:1')
			act(() => {
				node
					.querySelector('#button')
					?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
			})
			await sleep(200)
			expect(node.querySelector('#addValue')?.innerHTML).toEqual('value:2')
		})

		test('should read state in effects', async () => {
			function App() {
				const [{ value }, { addValueByEffectAndState }] = useModel(countModel)
				return (
					<div>
						<div id="addValue">value:{value}</div>
						<div id="button" onClick={() => addValueByEffectAndState()}>
							addValue
						</div>
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
			expect(node.querySelector('#addValue')?.innerHTML).toEqual('value:1')
			act(() => {
				node
					.querySelector('#button')
					?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
			})
			await sleep(200)
			expect(node.querySelector('#addValue')?.innerHTML).toEqual('value:3')
		})
	})

	describe('effects dispatch with dependency models', () => {
		test('depends state', () => {
			function App() {
				const [{ value }, { addValueByDependsState }] = useModel(countModel)
				return (
					<div>
						<div id="addValue">value:{value}</div>
						<div id="button" onClick={() => addValueByDependsState()}>
							addValue
						</div>
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
			expect(node.querySelector('#addValue')?.innerHTML).toEqual('value:1')
			act(() => {
				node
					.querySelector('#button')
					?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
			})
			expect(node.querySelector('#addValue')?.innerHTML).toEqual('value:2')
		})
	})
	test('depends dispatch', () => {
		function App() {
			const [, { addStepByDependsDispatch }] = useModel(countModel)
			const [{ step }] = useModel(stepModel)
			return (
				<div>
					<div id="addValue">step:{step}</div>
					<div id="button" onClick={() => addStepByDependsDispatch()}>
						addValue
					</div>
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
		expect(node.querySelector('#addValue')?.innerHTML).toEqual('step:1')
		act(() => {
			node
				.querySelector('#button')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		expect(node.querySelector('#addValue')?.innerHTML).toEqual('step:2')
	})
})
