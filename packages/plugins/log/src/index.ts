import { IPlugin } from '@shuvi/redox'

const redoxLog: IPlugin = function () {
	return {
		onStoreCreated(Store) {
			const StoreDispatch = Store.dispatch
			Store.dispatch = function (action) {
				console.log('action: ', action)
				const res = StoreDispatch(action)
				console.log('$state :', Store.$state())
				return res
			}
		},
	}
}

export default redoxLog
