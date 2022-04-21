import { useEffect, useState, useMemo, useRef } from 'react'
import { redox } from '@shuvi/redox'
import type { IModelManager, RedoxStore, AnyModel } from '@shuvi/redox'
import { createBatchManager } from './batchManager'
import { shadowEqual } from './utils'
import { IUseModel, ISelector } from './types'

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
	return selector(modelState, ModelViews)
}

function getStateActions<
	IModel extends AnyModel,
	Selector extends ISelector<IModel>
>(model: IModel, modelManager: IModelManager, selector?: Selector) {
	const redoxStore = modelManager._getRedox(model)
	return tuplify(getStateOrViews(redoxStore, selector), redoxStore.$actions)
}

function initModel(
	model: AnyModel,
	modelManager: IModelManager,
	batchManager: ReturnType<typeof createBatchManager>
) {
	if (!batchManager.hasInitModel(model)) {
		batchManager.initModel(model)
		const unSubscribe = modelManager.subscribe(model, function () {
			batchManager.triggerSubscribe(model) // render self;
		})
		batchManager.destroyTask(unSubscribe)
	}
}

const createUseModel =
	(
		modelManager: IModelManager,
		batchManager: ReturnType<typeof createBatchManager>
	) =>
	<IModel extends AnyModel, Selector extends ISelector<IModel>>(
		model: IModel,
		selector?: Selector
	) => {
		const initialValue = useMemo(() => {
			initModel(model, modelManager, batchManager)
			return getStateActions(model, modelManager, selector)
		}, [])

		const [modelValue, setModelValue] = useState(initialValue)

		const lastValueRef = useRef<any>(initialValue)

		useEffect(() => {
			const fn = () => {
				const newValue = getStateActions(model, modelManager, selector)
				if (!shadowEqual(lastValueRef.current[0], newValue[0])) {
					setModelValue(newValue as any)
					lastValueRef.current = newValue
				}
			}
			const unSubscribe = batchManager.addSubscribe(model, fn)

			return () => {
				unSubscribe()
			}
		}, [])

		return modelValue
	}

const useModel: IUseModel = <
	IModel extends AnyModel,
	Selector extends ISelector<IModel>
>(
	model: IModel,
	selector?: Selector
) => {
	let [modelManager, batchManager] = useMemo(() => {
		return [redox(), createBatchManager()]
	}, [])

	const res = useMemo(() => createUseModel(modelManager, batchManager), [])(
		model,
		selector
	)

	useEffect(() => {
		return function () {
			batchManager.destroy()
		}
	}, [])

	return res
}

export { useModel, createUseModel, initModel, getStateActions }
