import { useEffect, useState, useMemo, useRef } from 'react'
import { redox, validate } from '@shuvi/redox'
import type { IModelManager, RedoxStore, AnyModel } from '@shuvi/redox'
import { createBatchManager } from './batchManager'
import { shadowEqual } from './utils'
import { IUseModel, ISelector, ISelectorParams } from './types'

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
	Object.assign(tempObj, modelState, ModelViews)
	return selector(tempObj)
}

function getStateActions<
	IModel extends AnyModel,
	Selector extends ISelector<IModel>
>(model: IModel, modelManager: IModelManager, selector?: Selector) {
	const redoxStore = modelManager._getRedox(model)
	return tuplify(getStateOrViews(redoxStore, selector), redoxStore.$actions)
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
		const initialValue = useMemo(
			function () {
				return getStateActions(model, modelManager, selector)
			},
			[modelManager, batchManager]
		)

		const [modelValue, setModelValue] = useState(initialValue)

		const lastValueRef = useRef<any>(initialValue)

		const isUpdate = useRef(false)

		useEffect(
			function () {
				const fn = function () {
					const newValue = getStateActions(model, modelManager, selector)
					if (!shadowEqual(lastValueRef.current[0], newValue[0])) {
						setModelValue(newValue as any)
						lastValueRef.current = newValue
					}
				}
				if (isUpdate.current) {
					setModelValue(initialValue as any)
				} else {
					isUpdate.current = true
				}
				const unSubscribe = batchManager.addSubscribe(model, modelManager, fn)
				return () => {
					unSubscribe()
				}
			},
			[modelManager, batchManager]
		)

		return modelValue
	}

const useModel: IUseModel = <
	IModel extends AnyModel,
	Selector extends ISelector<IModel>
>(
	model: IModel,
	selector?: Selector
) => {
	validate(() => [[!Boolean(model), `useModel param model is necessary`]])

	let [modelManager, batchManager] = useMemo(function () {
		return [redox(), createBatchManager()]
	}, [])

	const contextValue = useRef({
		modelManager,
		batchManager,
	})

	return useMemo(
		function () {
			return createUseModel(
				contextValue.current.modelManager,
				contextValue.current.batchManager
			)
		},
		[contextValue.current.modelManager, contextValue.current.batchManager]
	)(model, selector)
}

export { useModel, createUseModel, getStateActions }
