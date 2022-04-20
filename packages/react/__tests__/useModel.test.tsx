/**
 * @jest-environment jsdom
 */

import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { defineModel } from '@shuvi/redox'
import { act } from 'react-dom/test-utils'
import { useModel, Provider, useGlobalModel } from '../src'
import { sleep, countModel, countSelectorParameters } from './models'

const countSelector = function (
	state: countSelectorParameters[0],
	views: countSelectorParameters[1]
) {
	return {
		v: state.value,
		t: views.test(2),
	}
}

let node: HTMLDivElement
beforeEach(() => {
	node = document.createElement('div')
	document.body.appendChild(node)
})

afterEach(() => {
	document.body.removeChild(node)
	;(node as unknown as null) = null
})

describe('useModel worked:', () => {
	test('reducer worked:', async () => {
		const App = () => {
			const [state, actions] = useModel(countModel)

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
			ReactDOM.render(
				<Provider>
					<App />
				</Provider>,
				node
			)
		})

		expect(node.querySelector('#value')?.innerHTML).toEqual('1')
		act(() => {
			node
				.querySelector('#button')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		expect(node.querySelector('#value')?.innerHTML).toEqual('2')
	})
	test('effect worked:', async () => {
		const App = () => {
			const [state, actions] = useModel(countModel)

			return (
				<>
					<div id="value">{state.value}</div>
					<button id="button" type="button" onClick={() => actions.asyncAdd(2)}>
						add
					</button>
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

		expect(node.querySelector('#value')?.innerHTML).toEqual('1')
		act(() => {
			node
				.querySelector('#button')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		await sleep(250)
		expect(node.querySelector('#value')?.innerHTML).toEqual('3')
	})
	test('selector worked:', async () => {
		const App = () => {
			const [state, actions] = useModel(countModel, countSelector)

			return (
				<>
					<div id="v">{state.v}</div>
					<div id="t">{state.t}</div>
					<button id="button" type="button" onClick={() => actions.add(2)}>
						add
					</button>
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

		expect(node.querySelector('#v')?.innerHTML).toEqual('1')
		expect(node.querySelector('#t')?.innerHTML).toEqual('3')
		act(() => {
			node
				.querySelector('#button')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		expect(node.querySelector('#v')?.innerHTML).toEqual('3')
		expect(node.querySelector('#t')?.innerHTML).toEqual('5')
	})
	test('depends worked:', async () => {
		const newModel = defineModel(
			{
				name: 'newModel',
				state: { value: 0 },
				reducers: {
					add(state, payload: number = 1) {
						state.value += payload
					},
				},
				effects: {
					async asyncAdd() {
						await this.$dep.countModel.asyncAdd(1)
						this.add(this.$dep.countModel.$state().value)
					},
				},
				views: {
					test(_state, dependsState) {
						return dependsState.countModel.value * 2
					},
				},
			},
			[countModel]
		)

		const App = () => {
			const [state, actions] = useModel(newModel, function (state, views) {
				return {
					v: state.value,
					t: views.test(),
				}
			})

			return (
				<>
					<div id="v">{state.v}</div>
					<div id="t">{state.t}</div>
					<button id="button" type="button" onClick={() => actions.asyncAdd()}>
						add
					</button>
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

		expect(node.querySelector('#v')?.innerHTML).toEqual('0')
		expect(node.querySelector('#t')?.innerHTML).toEqual('2')
		act(() => {
			node
				.querySelector('#button')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		await sleep(250)
		expect(node.querySelector('#v')?.innerHTML).toEqual('2')
		expect(node.querySelector('#t')?.innerHTML).toEqual('4')
	})
	describe('selector only run init and state changed:', () => {
		test('inlined selector:', async () => {
			let selectorRunCount = 0
			const App = () => {
				const [_state, actions] = useModel(countModel, function () {
					selectorRunCount++
					return 1
				})
				const [_index, setIndex] = React.useState(0)

				return (
					<>
						<button id="button" type="button" onClick={() => setIndex(1)}>
							setIndex
						</button>
						<button
							id="action"
							type="button"
							onClick={() => {
								actions.add()
							}}
						>
							action
						</button>
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

			expect(selectorRunCount).toBe(1)
			act(() => {
				node
					.querySelector('#button')
					?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
			})
			expect(selectorRunCount).toBe(1)
			act(() => {
				node
					.querySelector('#action')
					?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
			})
			expect(selectorRunCount).toBe(2)
		})
		test('selector outside:', async () => {
			let selectorRunCount = 0
			const countSelector = function () {
				selectorRunCount++
				return 1
			}
			const App = () => {
				const [_state, actions] = useModel(countModel, countSelector)
				const [_index, setIndex] = React.useState(0)

				return (
					<>
						<button id="button" type="button" onClick={() => setIndex(1)}>
							setIndex
						</button>
						<button id="action" type="button" onClick={() => actions.add()}>
							action
						</button>
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

			expect(selectorRunCount).toBe(1)
			act(() => {
				node
					.querySelector('#button')
					?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
			})
			expect(selectorRunCount).toBe(1)
			act(() => {
				node
					.querySelector('#action')
					?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
			})
			expect(selectorRunCount).toBe(2)
		})
	})
	test('useModel useGlobalModel is isolation:', async () => {
		const App = () => {
			const [state, actions] = useGlobalModel(countModel)
			const [state1, actions1] = useModel(countModel)

			return (
				<>
					<div id="value">{state.value}</div>
					<button id="button" type="button" onClick={() => actions.add(2)}>
						add
					</button>
					<div id="value1">{state1.value}</div>
					<button id="button1" type="button" onClick={() => actions1.add(2)}>
						add1
					</button>
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

		expect(node.querySelector('#value')?.innerHTML).toEqual('1')
		expect(node.querySelector('#value1')?.innerHTML).toEqual('1')
		act(() => {
			node
				.querySelector('#button')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		expect(node.querySelector('#value')?.innerHTML).toEqual('3')
		expect(node.querySelector('#value1')?.innerHTML).toEqual('1')
	})
	test('useModel self is isolation:', async () => {
		const App = () => {
			const [state, actions] = useModel(countModel)
			const [state1, actions1] = useModel(countModel)

			return (
				<>
					<div id="value">{state.value}</div>
					<button id="button" type="button" onClick={() => actions.add(2)}>
						add
					</button>
					<div id="value1">{state1.value}</div>
					<button id="button1" type="button" onClick={() => actions1.add(2)}>
						add1
					</button>
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

		expect(node.querySelector('#value')?.innerHTML).toEqual('1')
		expect(node.querySelector('#value1')?.innerHTML).toEqual('1')
		act(() => {
			node
				.querySelector('#button')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		expect(node.querySelector('#value')?.innerHTML).toEqual('3')
		expect(node.querySelector('#value1')?.innerHTML).toEqual('1')
	})
})
