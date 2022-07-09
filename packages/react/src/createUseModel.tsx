import { useEffect, useState, useMemo, useRef } from 'react'
import type { IStoreManager, AnyModel, ISelector } from '@shuvi/redox'
import { createBatchManager } from './batchManager'
import { getStateActions } from './getStateActions'

export const createUseModel =
	(
		storeManager: IStoreManager,
		batchManager: ReturnType<typeof createBatchManager>
	) =>
	<IModel extends AnyModel, Selector extends ISelector<IModel>>(
		model: IModel,
		selector?: Selector,
		depends?: any[]
	) => {
		const selectorRef = useRef<
			undefined | ((() => ReturnType<Selector>) & { clearCache: () => void })
		>(undefined)

		const cacheFn = useMemo(
			function () {
				if (!selector) {
					return undefined
				}
				selectorRef.current = storeManager.get(model).$createSelector(selector)
				return selectorRef.current
			},
			/**
			 * think about below case
			 */
			// useModel(model, selector) => useCallback(selector)
			// useModel(model, selector, []) => useCallback(selector, [])
			// useModel(model, selector, [a,b]) => useCallback(selector, [a,b])
			[storeManager, batchManager, ...(depends ? depends : [selector])]
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
				return getStateActions(model, storeManager, selectorRef.current)
			},
			[storeManager, batchManager]
		)

		const [modelValue, setModelValue] = useState(initialValue)

		const lastValueRef = useRef<any>(initialValue)

		useEffect(
			function () {
				// useEffect is async, there's maybe some async update state before store subscribe
				// check state and actions once, need update if it changed
				const newValue = getStateActions(
					model,
					storeManager,
					selectorRef.current
				)
				if (
					// selector maybe return new object each time, compare value with shadowEqual
					lastValueRef.current[0] !== newValue[0] ||
					lastValueRef.current[1] !== newValue[1]
				) {
					setModelValue(newValue as any)
					lastValueRef.current = newValue
				}
			},
			// if depends changed, need updated once
			[storeManager, batchManager, ...(depends || [])]
		)

		useEffect(
			function () {
				const fn = function () {
					const newValue = getStateActions(
						model,
						storeManager,
						selectorRef.current
					)
					if (lastValueRef.current[0] !== newValue[0]) {
						setModelValue(newValue as any)
						lastValueRef.current = newValue
					}
				}

				const unSubscribe = batchManager.addSubscribe(model, storeManager, fn)

				return () => {
					unSubscribe()
				}
			},
			[storeManager, batchManager]
		)

		return modelValue
	}
