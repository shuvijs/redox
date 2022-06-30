import type { IStoreManager, Store, AnyModel, ISelector } from '@shuvi/redox'

function tuplify<T extends any[]>(...elements: T) {
	return elements
}

function getStateOrViews<
	IModel extends AnyModel,
	Selector extends ISelector<IModel>
>(store: Store<IModel>, selector?: () => ReturnType<Selector>) {
	const modelState = store.$state
	if (!selector) {
		return modelState
	}
	return selector()
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
	return tuplify(getStateOrViews(store, selector), store.$actions)
}

export { getStateActions }
