import { useEffect, useState, useMemo, useRef } from 'react'
import type { IModelManager, AnyModel } from '@shuvi/redox'
import { createBatchManager } from './batchManager'
import { ISelector } from './types'
import { getStateActions } from './getStateActions'
import { cacheSelector } from './cacheSelector'

export const createUseModel =
	(
		modelManager: IModelManager,
		batchManager: ReturnType<typeof createBatchManager>
	) =>
	<IModel extends AnyModel, Selector extends ISelector<IModel>>(
		model: IModel,
		selector?: Selector
	) => {
		const selectorFn = useRef<undefined | ReturnType<typeof cacheSelector>>(
			undefined
		)

		const cacheFn = useMemo(
			function () {
				if (!selector) {
					return undefined
				}
				selectorFn.current = cacheSelector(selector)
				return selectorFn.current
			},
			[modelManager, batchManager, selector]
		)

		useEffect(
			function () {
				return function () {
					cacheFn?.clearCache()
				}
			},
			[cacheFn]
		)

		const initialValue = useMemo(
			function () {
				return getStateActions(model, modelManager, selectorFn.current)
			},
			[modelManager, batchManager]
		)

		const [modelValue, setModelValue] = useState(initialValue)

		const lastValueRef = useRef<any>(initialValue)

		useEffect(
			function () {
				const fn = function () {
					const newValue = getStateActions(
						model,
						modelManager,
						selectorFn.current
					)
					if (lastValueRef.current[0] !== newValue[0]) {
						setModelValue(newValue as any)
						lastValueRef.current = newValue
					}
				}

				const unSubscribe = batchManager.addSubscribe(model, modelManager, fn)

				// useEffect is async, there's maybe some async update state before store subscribe
				// check state and actions once, need update if it changed
				const newValue = getStateActions(
					model,
					modelManager,
					selectorFn.current
				)
				if (
					// selector maybe return new object each time, compare value with shadowEqual
					lastValueRef.current[0] !== newValue[0] ||
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
