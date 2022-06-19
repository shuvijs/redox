/**
 * @jest-environment jsdom
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import { defineModel } from '@shuvi/redox'
import { useModel, useRootModel, RedoxRoot } from '../src'
import { countModel, countSelectorParameters } from './models'

const countSelector = function (stateAndViews: countSelectorParameters) {
	return {
		v: stateAndViews.value,
		t: stateAndViews.test(2),
	}
}

let container: HTMLDivElement
beforeEach(() => {
	jest.useFakeTimers()
	container = document.createElement('div')
	document.body.appendChild(container)
})

afterEach(() => {
	document.body.removeChild(container)
	;(container as unknown as null) = null
})

test('no model name worked:', async () => {
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
		const [state, actions] = useModel(tempModel)

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

test('immer worked:', async () => {
	const immer = defineModel({
		name: 'immer',
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
		const [state, actions] = useModel(immer)

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

test('action worked:', async () => {
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
	await act(async () => {
		ReactDOM.createRoot(container).render(
			<RedoxRoot>
				<App />
			</RedoxRoot>
		)
	})

	expect(container.querySelector('#value')?.innerHTML).toEqual('1')
	await act(async () => {
		container
			.querySelector('#button')
			?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
	})
	await act(async () => {
		jest.runAllTimers()
	})
	expect(container.querySelector('#value')?.innerHTML).toEqual('3')
})

test('views worked:', async () => {
	let viewComputedTime = 0
	const views = defineModel({
		name: 'views',
		state: {
			value: 1,
			value1: 1,
		},
		reducers: {
			add(state, payload: number = 1) {
				state.value += payload
			},
		},
		views: {
			test() {
				viewComputedTime++
				return this.value1
			},
		},
	})
	const App = () => {
		const [state, actions] = useModel(views, function (stateAndViews) {
			return stateAndViews.test()
		})

		return (
			<>
				<div id="value">{state}</div>
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
	expect(viewComputedTime).toBe(1)
	act(() => {
		container
			.querySelector('#button')
			?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
	})
	expect(viewComputedTime).toBe(1)
	expect(container.querySelector('#value')?.innerHTML).toEqual('1')
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
		ReactDOM.createRoot(container).render(
			<RedoxRoot>
				<App />
			</RedoxRoot>
		)
	})

	expect(container.querySelector('#v')?.innerHTML).toEqual('1')
	expect(container.querySelector('#t')?.innerHTML).toEqual('3')
	act(() => {
		container
			.querySelector('#button')
			?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
	})
	expect(container.querySelector('#v')?.innerHTML).toEqual('3')
	expect(container.querySelector('#t')?.innerHTML).toEqual('5')
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
			actions: {
				async asyncAdd() {
					await this.$dep.countModel.asyncAdd(1)
					this.add(this.$dep.countModel.$state().value)
				},
			},
			views: {
				test() {
					return this.$dep.countModel.value * 2
				},
			},
		},
		[countModel]
	)

	const App = () => {
		const [state, actions] = useModel(newModel, function (stateAndViews) {
			return {
				v: stateAndViews.value,
				t: stateAndViews.test(),
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
		ReactDOM.createRoot(container).render(
			<RedoxRoot>
				<App />
			</RedoxRoot>
		)
	})

	expect(container.querySelector('#v')?.innerHTML).toEqual('0')
	expect(container.querySelector('#t')?.innerHTML).toEqual('2')
	act(() => {
		container
			.querySelector('#button')
			?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
	})
	await act(async () => {
		jest.runAllTimers()
	})
	expect(container.querySelector('#v')?.innerHTML).toEqual('2')
	expect(container.querySelector('#t')?.innerHTML).toEqual('4')
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
			ReactDOM.createRoot(container).render(
				<RedoxRoot>
					<App />
				</RedoxRoot>
			)
		})

		expect(selectorRunCount).toBe(2)
		act(() => {
			container
				.querySelector('#button')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		expect(selectorRunCount).toBe(2)
		act(() => {
			container
				.querySelector('#action')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		expect(selectorRunCount).toBe(3)
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
			ReactDOM.createRoot(container).render(
				<RedoxRoot>
					<App />
				</RedoxRoot>
			)
		})

		expect(selectorRunCount).toBe(2)
		act(() => {
			container
				.querySelector('#button')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		expect(selectorRunCount).toBe(2)
		act(() => {
			container
				.querySelector('#action')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		expect(selectorRunCount).toBe(3)
	})
})

test('useModel useRootModel is isolation:', async () => {
	const App = () => {
		const [state, actions] = useRootModel(countModel)
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
		ReactDOM.createRoot(container).render(
			<RedoxRoot>
				<App />
			</RedoxRoot>
		)
	})

	expect(container.querySelector('#value')?.innerHTML).toEqual('1')
	expect(container.querySelector('#value1')?.innerHTML).toEqual('1')
	act(() => {
		container
			.querySelector('#button')
			?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
	})
	expect(container.querySelector('#value')?.innerHTML).toEqual('3')
	expect(container.querySelector('#value1')?.innerHTML).toEqual('1')
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
		ReactDOM.createRoot(container).render(
			<RedoxRoot>
				<App />
			</RedoxRoot>
		)
	})

	expect(container.querySelector('#value')?.innerHTML).toEqual('1')
	expect(container.querySelector('#value1')?.innerHTML).toEqual('1')
	act(() => {
		container
			.querySelector('#button')
			?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
	})
	expect(container.querySelector('#value')?.innerHTML).toEqual('3')
	expect(container.querySelector('#value1')?.innerHTML).toEqual('1')
})

test('useModel should catch up the update occuring between first render and subscription', async () => {
	let actions: any
	let first = true
	const App = () => {
		const [{ value }, _actions] = useModel(countModel)
		actions = _actions

		// simulate a update between first render and store subscription
		if (first) {
			first = false
			actions.add(1)
		}

		return <div id="value">{value}</div>
	}

	act(() => {
		ReactDOM.createRoot(container).render(
			<RedoxRoot>
				<App />
			</RedoxRoot>
		)
	})

	// wait for another render caused by useEffect
	await act(async () => {
		jest.runAllTimers()
	})

	expect(container.querySelector('#value')!.textContent).toEqual('2')
})
