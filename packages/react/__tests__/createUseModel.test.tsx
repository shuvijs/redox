/**
 * @jest-environment jsdom
 */

import React, { useMemo } from 'react'
import ReactDOM from 'react-dom/client'
// @ts-ignore
import { act } from 'react-dom/test-utils'
import {
	defineModel,
	redox,
	AnyModel,
	ISelector,
	ISelectorParams,
} from '@shuvi/redox'
import { createBatchManager } from '../src/batchManager'
import { IUseModel } from '../src/types'
import { createUseModel } from '../src/createUseModel'
import { countModel } from './models'

let storeManager: ReturnType<typeof redox>
let batchManager: ReturnType<typeof createBatchManager>
let useTestModel: IUseModel
let container: HTMLDivElement

beforeEach(() => {
	jest.useFakeTimers()
	storeManager = redox()
	batchManager = createBatchManager()
	useTestModel = <IModel extends AnyModel, Selector extends ISelector<IModel>>(
		model: IModel,
		selector?: Selector
	) => {
		return useMemo(
			() => createUseModel(storeManager, batchManager),
			[storeManager, batchManager]
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
							this.add(this.$dep.countModel.$state.value)
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
				const [_state, actions] = useTestModel(
					countModel,
					function (stateAndViews) {
						selectorRunCount++
						return stateAndViews.value
					}
				)
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

			expect(selectorRunCount).toBe(1)
			act(() => {
				container
					.querySelector('#button')
					?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
			})
			expect(selectorRunCount).toBe(1)
			act(() => {
				container
					.querySelector('#action')
					?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
			})
			expect(selectorRunCount).toBe(2)
		})

		test('selector outside', async () => {
			let selectorRunCount = 0
			const countSelector = function (
				stateAndViews: ISelectorParams<typeof countModel>
			) {
				selectorRunCount++
				return stateAndViews.value
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

			expect(selectorRunCount).toBe(1)
			act(() => {
				container
					.querySelector('#button')
					?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
			})
			expect(selectorRunCount).toBe(1)
			act(() => {
				container
					.querySelector('#action')
					?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
			})
			expect(selectorRunCount).toBe(2)
		})

		test('condition selector', async () => {
			const countSelector0 = function () {
				return 0
			}
			const countSelector1 = function () {
				return 1
			}
			const App = () => {
				const [index, setIndex] = React.useState(0)
				const [state, actions] = useTestModel(
					countModel,
					index % 2 === 0 ? countSelector0 : countSelector1
				)

				return (
					<>
						<div id="value">{state}</div>
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

			expect(container.querySelector('#value')?.innerHTML).toEqual('0')
			act(() => {
				container
					.querySelector('#button')
					?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
			})
			expect(container.querySelector('#value')?.innerHTML).toEqual('0')
			act(() => {
				container
					.querySelector('#action')
					?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
			})
			expect(container.querySelector('#value')?.innerHTML).toEqual('1')
		})

		test('should clear prev selector cache', async () => {
			let selectorRunTime0 = 0
			const countSelector0 = function () {
				selectorRunTime0++
				console.log('selectorRunTime0: ', selectorRunTime0)
				return 0
			}
			let selectorRunTime1 = 0
			const countSelector1 = function () {
				selectorRunTime1++
				console.log('selectorRunTime1: ', selectorRunTime1)
				return 1
			}
			const App = () => {
				let [index, setIndex] = React.useState(1)
				console.log('index: ', index, index % 3 === 0)
				const [state, actions] = useTestModel(
					countModel,
					index % 3 === 0 ? countSelector0 : countSelector1
				)

				return (
					<>
						<div id="value">{state}</div>
						<button
							id="button"
							type="button"
							onClick={() => setIndex(index + 1)}
						>
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

			// countSelector1 run and cache countSelector1
			expect(selectorRunTime0).toBe(0)
			expect(selectorRunTime1).toBe(1)
			expect(container.querySelector('#value')?.innerHTML).toEqual('1')
			act(() => {
				container
					.querySelector('#button')
					?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
			})
			act(() => {
				// trigger selector run
				container
					.querySelector('#action')
					?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
			})
			// valid cache worked, use countSelector1 cache, not computed
			expect(selectorRunTime0).toBe(0)
			expect(selectorRunTime1).toBe(1)
			expect(container.querySelector('#value')?.innerHTML).toEqual('1')
			act(() => {
				container
					.querySelector('#button')
					?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
				container
					.querySelector('#button')
					?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
			})
			act(() => {
				// trigger selector run
				container
					.querySelector('#action')
					?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
			})
			// valid drop countSelector1 cache,  countSelector0 run and cache countSelector0
			expect(selectorRunTime0).toBe(1)
			expect(selectorRunTime1).toBe(1)
			expect(container.querySelector('#value')?.innerHTML).toEqual('0')
			act(() => {
				container
					.querySelector('#button')
					?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
			})
			act(() => {
				// trigger selector run
				container
					.querySelector('#action')
					?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
			})
			// valid should drop countSelector0 cache,  countSelector1 run and cache countSelector1
			expect(selectorRunTime0).toBe(1)
			expect(selectorRunTime1).toBe(2)
			expect(container.querySelector('#value')?.innerHTML).toEqual('1')
		})

		test('should throw error if changed state in a selector', () => {
			const App = () => {
				const [_state] = useTestModel(countModel, function (stateAndViews) {
					stateAndViews.value = 1
					return stateAndViews.value
				})
				return null
			}
			expect(() => {
				act(() => {
					ReactDOM.createRoot(container).render(<App />)
				})
			}).toThrow()
		})

		describe('support selector', () => {})
	})

	test('cloud trigger component render outside of component', () => {
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
			const countStore = storeManager.get(countModel)
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
