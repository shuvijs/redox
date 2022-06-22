import { useEffect, useState, useMemo, useRef } from 'react'
import type { IModelManager, AnyModel } from '@shuvi/redox'
import { createBatchManager } from './batchManager'
import { shadowEqual } from './utils'
import { ISelector } from './types'
import { getStateActions } from './getStateActions'

const createUseModel =
	(
		modelManager: IModelManager,
		batchManager: ReturnType<typeof createBatchManager>
	) =>
	<IModel extends AnyModel, Selector extends ISelector<IModel>>(
		model: IModel,
		selector?: Selector
	) => {
		// const selectorFn = useMemo(function(selector?: Selector){
		// 	if(!selector){
		// 		return undefined;
		// 	}
		// 	return selector
		// }, [selector])

		const initialValue = useMemo(
			function () {
				return getStateActions(model, modelManager, selector)
			},
			[modelManager, batchManager]
		)

		const [modelValue, setModelValue] = useState(initialValue)

		const lastValueRef = useRef<any>(initialValue)

		useEffect(
			function () {
				const fn = function () {
					const newValue = getStateActions(model, modelManager, selector)
					if (!shadowEqual(lastValueRef.current[0], newValue[0])) {
						setModelValue(newValue as any)
						lastValueRef.current = newValue
					}
				}

				const unSubscribe = batchManager.addSubscribe(model, modelManager, fn)

				// useEffect is async, there's maybe some async update state before store subscribe
				// check state and actions once, need update if it changed
				const newValue = getStateActions(model, modelManager, selector)
				if (
					// selector maybe return new object each time, compare value with shadowEqual
					!shadowEqual(lastValueRef.current[0], newValue[0]) ||
					lastValueRef.current[1] !== newValue[1]
				) {
					setModelValue(newValue as any)
					lastValueRef.current = newValue
				}

				return () => {
					unSubscribe()
				}
			},
			[modelManager, batchManager]
		)

		return modelValue
	}

export { createUseModel }
