import { useEffect, useState, useMemo, useRef } from 'react'
import { redox, validate } from '@shuvi/redox'
import type { IModelManager, RedoxStore, AnyModel } from '@shuvi/redox'
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
	(modelManager: IModelManager) =>
	<IModel extends AnyModel, Selector extends ISelector<IModel>>(
		model: IModel,
		selector?: Selector
	) => {
		const initialValue = useMemo(
			function () {
				return getStateActions(model, modelManager, selector)
			},
			[modelManager]
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
				const unSubscribe = modelManager.subscribe(model, fn)
				// useEffect is async ,there's maybe some async update state between init and useEffect, trigger fn once
				fn()

				return () => {
					unSubscribe()
				}
			},
			[modelManager]
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
	if (process.env.NODE_ENV === 'development') {
		validate(() => [[!Boolean(model), `useModel param model is necessary`]])
	}

	let [modelManager] = useMemo(function () {
		return [redox()]
	}, [])

	const contextValue = useRef({
		modelManager,
	})

	return useMemo(
		function () {
			return createUseModel(contextValue.current.modelManager)
		},
		[contextValue.current.modelManager]
	)(model, selector)
}

export { useModel, createUseModel, getStateActions }
