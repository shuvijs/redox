import type { IModelManager, RedoxStore, AnyModel } from '@shuvi/redox'
import { ISelector, ISelectorParams } from './types'

function tuplify<T extends any[]>(...elements: T) {
	return elements
}

function getStateOrViews<
	IModel extends AnyModel,
	Selector extends ISelector<IModel>
>(redoxStore: RedoxStore<IModel>, selector?: Selector) {
	const modelState = redoxStore.$state()
	if (!selector) {
		return modelState
	}
	const ModelViews = redoxStore.$views
	const tempObj = Object.create(null) as ISelectorParams<IModel>
	Object.assign(
		tempObj,
		{
			$state: redoxStore.getState,
		},
		redoxStore.getState(),
		ModelViews
	)
	return selector(tempObj)
}

function getStateActions<
	IModel extends AnyModel,
	Selector extends ISelector<IModel>
>(model: IModel, modelManager: IModelManager, selector?: Selector) {
	const redoxStore = modelManager._getRedox(model)
	return tuplify(getStateOrViews(redoxStore, selector), redoxStore.$actions)
}

export { getStateActions }
