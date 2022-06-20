/**
 * @jest-environment jsdom
 */

import React, { useMemo } from 'react'
import ReactDOM from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import { defineModel, redox, AnyModel } from '@shuvi/redox'
import { createBatchManager } from '../src/batchManager'
import { IUseModel, ISelector } from '../src/types'
import { createUseModel } from '../src/createUseModel'
import { countModel } from './models'

let modelManager: ReturnType<typeof redox>
let batchManager: ReturnType<typeof createBatchManager>
let useTestModel: IUseModel
let container: HTMLDivElement

beforeEach(() => {
	jest.useFakeTimers()
	modelManager = redox()
	batchManager = createBatchManager()
	useTestModel = <IModel extends AnyModel, Selector extends ISelector<IModel>>(
		model: IModel,
		selector?: Selector
	) => {
		return useMemo(
			() => createUseModel(modelManager, batchManager),
			[modelManager, batchManager]
		)(model, selector)
	}
	container = document.createElement('div')
	document.body.appendChild(container)
})

afterEach(() => {
	document.body.removeChild(container)
	;(container as unknown as null) = null
})

describe('createUseModel', () => {
	describe('should rerender when state changed', () => {
		describe('should rerender when self state changed', () => {
			test(' change state by redox reducer', async () => {
				const App = () => {
					const [state, actions] = useTestModel(countModel)

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
					ReactDOM.createRoot(container).render(<App />)
				})

				expect(container.querySelector('#value')?.innerHTML).toEqual('1')
				act(() => {
					container
						.querySelector('#button')
						?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
				})
				expect(container.querySelector('#value')?.innerHTML).toEqual('2')
			})

			test('change state by redox reducer with immer way', async () => {
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
					const [state, actions] = useTestModel(immer)

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
					ReactDOM.createRoot(container).render(<App />)
				})

				expect(container.querySelector('#value')?.innerHTML).toEqual('1')
				act(() => {
					container
						.querySelector('#button')
						?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
				})
				expect(container.querySelector('#value')?.innerHTML).toEqual('2')
			})

			test('change state by redox action', async () => {
				const App = () => {
					const [state, actions] = useTestModel(countModel)

					return (
						<>
							<div id="value">{state.value}</div>
							<button
								id="button"
								type="button"
								onClick={() => actions.asyncAdd(2)}
							>
								add
							</button>
						</>
					)
				}
				await act(async () => {
					ReactDOM.createRoot(container).render(<App />)
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
		})

		test('should rerender when depends state changed', async () => {
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
				const [state, actions] = useTestModel(
					newModel,
					function (stateAndViews) {
						return {
							v: stateAndViews.value,
							t: stateAndViews.test(),
						}
					}
				)

				return (
					<>
						<div id="v">{state.v}</div>
						<div id="t">{state.t}</div>
						<button
							id="button"
							type="button"
							onClick={() => actions.asyncAdd()}
						>
							add
						</button>
					</>
				)
			}
			act(() => {
				ReactDOM.createRoot(container).render(<App />)
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
	})

	describe('support selector', () => {
		test('inlined selector', async () => {
			let selectorRunCount = 0
			const App = () => {
				const [_state, actions] = useTestModel(countModel, function () {
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
				ReactDOM.createRoot(container).render(<App />)
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

		test('selector outside', async () => {
			let selectorRunCount = 0
			const countSelector = function () {
				selectorRunCount++
				return 1
			}
			const App = () => {
				const [_state, actions] = useTestModel(countModel, countSelector)
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
				ReactDOM.createRoot(container).render(<App />)
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

	test('should trigger component render outside of component', () => {
		let AppRenderCount = 0

		function App() {
			AppRenderCount += 1
			const [{ value }, _] = useTestModel(countModel)

			return (
				<>
					<div id="value">{`${value}`}</div>
				</>
			)
		}

		act(() => {
			ReactDOM.createRoot(container).render(<App />)
		})

		expect(AppRenderCount).toBe(1)

		act(() => {
			const countStore = modelManager.get(countModel)
			countStore.add()
		})

		expect(AppRenderCount).toBe(2)
	})

	test('should render with newest state even update state during render', async () => {
		let firstRender = true
		const App = () => {
			const [{ value }, actions] = useTestModel(countModel)

			if (firstRender) {
				firstRender = false
				actions.add(1)
			}

			return <div id="value">{value}</div>
		}

		act(() => {
			ReactDOM.createRoot(container).render(<App />)
		})

		expect(container.querySelector('#value')!.textContent).toEqual('2')
	})
})
