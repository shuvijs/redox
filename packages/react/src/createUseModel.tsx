import { useEffect, useState, useMemo, useRef } from 'react'
import {
	getRawValueDeep,
	compareArguments,
	createProxyObjFactory,
	ICompare,
	isProxy,
	getTarget,
	isComplexObject,
} from '@shuvi/redox/views'
import { createSelector } from '@shuvi/redox/createSelector'
import { validate } from '@shuvi/redox'
import type { IModelManager, AnyModel } from '@shuvi/redox'
import { createBatchManager } from './batchManager'
import { ISelector } from './types'
import { getStateActions } from './getStateActions'

const stateCreateProxyObj = createProxyObjFactory()

let isCollectionKeys = false
let compareStatePos: ICompare

const getStateCollection = () => {
	return {
		get(target: any, p: string | symbol): any {
			if (p === isProxy) return true
			if (p === getTarget) return target
			let result = target[p]

			if (isCollectionKeys) {
				const compareTree = compareStatePos.tree
				const treeNode = compareTree.get(target)

				if (treeNode) {
					treeNode.children[p as string] = result
				} else {
					compareTree.set(target, {
						children: {
							[p]: result,
						},
					})
				}

				if (isComplexObject(result)) {
					result = stateCreateProxyObj(result, getStateCollection)
				}

				// OwnProperty function should be a $state or view
				if (typeof result === 'function' && target.hasOwnProperty(p)) {
					if (p === '$state') {
						const $state = result
						result = function () {
							let state = $state()
							compareTree.set($state, {
								children: state,
							})

							if (isComplexObject(state)) {
								state = stateCreateProxyObj(state, getStateCollection)
							}

							return state
						}
					} else {
						const view = result
						result = function (...args: any[]) {
							// call view fn
							let res = view(...args)
							// if child views fn call, go on collects current scope used keys
							const compareView = compareStatePos.view
							const viewNode = compareView.get(view)
							if (!viewNode) {
								compareView.set(view, new Map([[args, res]]))
							} else {
								viewNode.set(args, res)
							}
							return res
						}
					}
				}
			}
			return result
		},
		set() {
			if (process.env.NODE_ENV === 'development') {
				validate(() => [[true, `not allow change any state in the view !`]])
			}
			return false
		},
	}
}

export function cacheFactory(fn: (...args: any[]) => any) {
	const stateAndViewsCompare: ICompare = {
		tree: new Map(),
		view: new Map(),
	}

	function resetCompare() {
		stateAndViewsCompare.tree.clear()
		for (const view of stateAndViewsCompare.view.values()) {
			view.clear()
		}
		stateAndViewsCompare.view.clear()
	}

	let cacheSelector = createSelector(
		(stateAndViews: any) => {
			// reset compare
			resetCompare()
			compareStatePos = stateAndViewsCompare

			const stateAndViewsProxy = stateCreateProxyObj(
				stateAndViews,
				getStateCollection
			)

			isCollectionKeys = true // just keep collection keys when fn call
			let res = fn.call(null, stateAndViewsProxy)
			isCollectionKeys = false
			// console.log(
			// 	'modelName=>',
			// 	stateAndViewsCompare
			// )

			// case 1 return Proxy()
			// return Proxy(origin Object) need return origin Object
			// case 2 user define xxx key
			// return {xxx: Proxy(origin Object)} need return {xxx: origin Object}
			res = getRawValueDeep(res)
			return res
		},
		{
			// false => need recomputed, true => use cache value
			equalityCheck: (_prev: any, next: any, _argsIndex: number) => {
				// stateAndViewsCompare
				return compareArguments(next, stateAndViewsCompare)
			},
		}
	)
	let originClearCache = cacheSelector.clearCache
	cacheSelector.clearCache = function () {
		resetCompare()
		originClearCache()
		// @ts-ignore
		originClearCache = null
		// @ts-ignore
		cacheSelector = null
	}
	return cacheSelector
}

export const createUseModel =
	(
		modelManager: IModelManager,
		batchManager: ReturnType<typeof createBatchManager>
	) =>
	<IModel extends AnyModel, Selector extends ISelector<IModel>>(
		model: IModel,
		selector?: Selector
	) => {
		const selectorFn = useMemo(
			function () {
				if (!selector) {
					return undefined
				}
				return cacheFactory(selector)
			},
			[selector]
		)

		useEffect(
			function () {
				return function () {
					selectorFn?.clearCache()
				}
			},
			[selectorFn]
		)

		const initialValue = useMemo(
			function () {
				return getStateActions(model, modelManager, selectorFn)
			},
			[modelManager, batchManager]
		)

		const [modelValue, setModelValue] = useState(initialValue)

		const lastValueRef = useRef<any>(initialValue)

		useEffect(
			function () {
				const fn = function () {
					const newValue = getStateActions(model, modelManager, selectorFn)
					if (lastValueRef.current[0] !== newValue[0]) {
						setModelValue(newValue as any)
						lastValueRef.current = newValue
					}
				}

				const unSubscribe = batchManager.addSubscribe(model, modelManager, fn)

				// useEffect is async, there's maybe some async update state before store subscribe
				// check state and actions once, need update if it changed
				const newValue = getStateActions(model, modelManager, selectorFn)
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
