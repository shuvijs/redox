import type {
	IStoreManager,
	Store,
	AnyModel,
	ISelector,
	ISelectorParams,
} from '@shuvi/redox'

function tuplify<T extends any[]>(...elements: T) {
	return elements
}

function updateStateAndViews<IModel extends AnyModel>(store: Store<IModel>) {
	const stateAndViews = { $state: store.$state } as ISelectorParams<IModel>
	Object.assign(stateAndViews, store.$state, store.$views)
	;(
		store as Store<IModel> & {
			$stateAndViews: ISelectorParams<IModel>
		}
	).$stateAndViews = new Proxy(stateAndViews, {
		get(target: any, p: string | symbol): any {
			let result = target[p]

			// OwnProperty function should be $state and view
			if (typeof result === 'function' && target.hasOwnProperty(p)) {
				const view = result
				// call view fn
				let res = view()
				// cache view result
				target[p] = res
				return res
			}

			return result
		},
		set() {
			if (process.env.NODE_ENV === 'development') {
				console.error(`not allow change any thing !`)
			}
			return false
		},
	})
}

function getStateActions<
	IModel extends AnyModel,
	Selector extends ISelector<IModel>
>(
	model: IModel,
	storeManager: IStoreManager,
	selector?: () => ReturnType<Selector>
) {
	const store = storeManager.get(model)
	let state: ISelectorParams<IModel> | ReturnType<Selector>
	if (!selector) {
		if (!store.$stateAndViews) {
			updateStateAndViews(store)
			storeManager.subscribe(model, function () {
				updateStateAndViews(store)
			})
		}
		state = store.$stateAndViews as ISelectorParams<IModel>
	} else {
		state = selector()
	}
	return tuplify(state, store.$actions)
}

export { getStateActions }
