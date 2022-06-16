import { IPlugin } from './redoxStore'
import validate from './validate'

const SET_FROM_DEVTOOLS = '@@redox/SET_FROM_DEVTOOLS'

const reduxDevTools: IPlugin = function () {
	let id = 0
	const unsubscribeSet = new Set<() => void>()
	return {
		onStoreCreated(Store) {
			if (
				typeof window !== 'undefined' &&
				(window as any).__REDUX_DEVTOOLS_EXTENSION__
			) {
				const originReducer = Store.$reducer
				const devTools = (window as any).__REDUX_DEVTOOLS_EXTENSION__!.connect({
					name: Store.model.name || `model_${id++}`,
				})

				const initialState = Store.$state()
				devTools.init(initialState)

				let isLatestState = true
				let latestState: any = Store.$state()
				const fn = (message: any) => {
					switch (message.type) {
						case 'ACTION':
							validate(() => [
								[
									typeof message.payload !== 'string',
									'Unsupported action format',
								],
							])
							try {
								const action = JSON.parse(message.payload)
								return Store.dispatch(action)
							} catch (e) {
								return validate(() => [
									[true, `Could not parse the received json.`],
								])
							}

						case 'DISPATCH':
							switch (message.payload.type) {
								case 'RESET':
									return devTools.init(Store.$state())

								case 'COMMIT':
									isLatestState = true
									return devTools.init(Store.$state())

								case 'ROLLBACK':
									isLatestState = true
									try {
										const parsedState = JSON.parse(message.state)
										const action = {
											type: SET_FROM_DEVTOOLS,
											payload: parsedState,
										}
										Store.dispatch(action)
										return devTools.init(Store.$state())
									} catch (e) {
										return validate(() => [
											[true, 'Could not parse the received json'],
										])
									}

								case 'JUMP_TO_STATE':
								case 'JUMP_TO_ACTION':
									try {
										const parsedState = JSON.parse(message.state)
										if (
											JSON.stringify(parsedState) ===
											JSON.stringify(latestState)
										) {
											isLatestState = true
										} else if (isLatestState) {
											isLatestState = false
											latestState = Store.$state()
										}
										const action = {
											type: SET_FROM_DEVTOOLS,
											payload: parsedState,
										}
										return Store.dispatch(action)
									} catch (e) {
										return validate(() => [
											[true, 'Could not parse the received json'],
										])
									}
							}
							return
					}
				}
				const unsubscribe = devTools.subscribe(fn)
				unsubscribeSet.add(unsubscribe)

				const $reducer: typeof Store.$reducer = function (state, action) {
					if (action.type === SET_FROM_DEVTOOLS) {
						return action.payload
					}
					if (!isLatestState) {
						const newState = originReducer!(latestState, action)
						latestState = newState
						devTools.send(action, newState)
						return state
					}
					const newState = originReducer!(state, action)
					devTools.send(action, newState)
					return newState
				}

				Store.$reducer = $reducer
			}
		},
		onDestroy() {
			for (const fn of unsubscribeSet.values()) {
				fn()
			}
			unsubscribeSet.clear()
		},
	}
}

export default reduxDevTools
