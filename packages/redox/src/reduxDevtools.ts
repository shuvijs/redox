import { IPlugin } from './redoxStore'

const reduxDevTools: IPlugin = function () {
	return {
		onStoreCreated(Store) {
			if (
				typeof window !== 'undefined' &&
				(window as any).__REDUX_DEVTOOLS_EXTENSION__
			) {
				const origDispatch = Store.dispatch

				console.log(Store.model.name, ' created')
				const devTools = (window as any).__REDUX_DEVTOOLS_EXTENSION__!.connect({
					name: Store.model.name,
				})
				devTools.init(Store.$state())

				const dispatch = function (action: any) {
					const r = origDispatch(action)
					devTools.send(action, Store.$state())
					return r
				}

				Store.dispatch = dispatch
			}
		},
	}
}

export default reduxDevTools
