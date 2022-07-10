import { useEffect, useState, useMemo, useRef } from 'react'
import type {
	IStoreManager,
	AnyModel,
	ISelector,
	ISelectorParams,
} from '@shuvi/redox'
import { createBatchManager } from './batchManager'
import { getStateActions } from './getStateActions'

function defaultSelector<IModel extends AnyModel>(
	stateAndViews: ISelectorParams<IModel>
): ISelectorParams<IModel> {
	const $stateKeys = Object.keys(stateAndViews.$state)
	$stateKeys.push('$state')
	const allKeys = Object.keys(stateAndViews)
	allKeys.forEach((key) => {
		if (!$stateKeys.includes(key)) {
			// call view for trigger cache
			stateAndViews[key]
		}
	})

	return stateAndViews
}

export const createUseModel =
	(
		storeManager: IStoreManager,
		batchManager: ReturnType<typeof createBatchManager>
	) =>
	<IModel extends AnyModel, Selector extends ISelector<IModel>>(
		model: IModel,
		selector: Selector = defaultSelector as Selector,
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

		const isInit = useRef<boolean>(false)

		useEffect(
			function () {
				// useEffect is async, there's maybe some async update state before store subscribe
				// check state and actions once, need update if it changed
				isInit.current = true
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
				return function () {
					isInit.current = false
				}
			},
			[storeManager, batchManager]
		)

		// selector change, need updated once
		useEffect(
			function () {
				if (isInit.current) {
					batchManager.triggerSubscribe(model)
				}
			},
			[batchManager, selectorRef.current]
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

export const createUseStaticModel =
	(
		storeManager: IStoreManager,
		batchManager: ReturnType<typeof createBatchManager>
	) =>
	<IModel extends AnyModel, Selector extends ISelector<IModel>>(
		model: IModel,
		selector: Selector = defaultSelector as Selector,
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

		const initialValue = useMemo(() => {
			return getStateActions(model, storeManager, selectorRef.current)
		}, [storeManager, batchManager])

		const stateRef = useRef<any>(initialValue[0])

		const value = useRef<[any, any]>([stateRef, initialValue[1]])

		const isInit = useRef<boolean>(false)

		useEffect(() => {
			// useEffect is async, there's maybe some async update state before store subscribe
			// check state and actions once, need update if it changed
			isInit.current = true
			const newValue = getStateActions(model, storeManager, selectorRef.current)
			if (
				stateRef.current !== newValue[0] ||
				value.current[1] !== newValue[1]
			) {
				stateRef.current = newValue[0]
				value.current = [stateRef, newValue[1]]
			}
			return () => {
				isInit.current = false
			}
		}, [storeManager, batchManager])

		// selector change, need updated once
		useEffect(
			function () {
				if (isInit.current) {
					batchManager.triggerSubscribe(model)
				}
			},
			[batchManager, selectorRef.current]
		)

		useEffect(() => {
			const fn = () => {
				const newValue = getStateActions(
					model,
					storeManager,
					selectorRef.current
				)
				if (stateRef.current !== newValue[0]) {
					stateRef.current = newValue[0]
				}
			}

			const unSubscribe = batchManager.addSubscribe(model, storeManager, fn)

			return () => {
				unSubscribe()
			}
		}, [storeManager, batchManager])

		return value.current
	}
