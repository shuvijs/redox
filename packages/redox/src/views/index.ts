import type { RedoxStore } from '../redoxStore'
import { createCache } from './createCache'
import { RedoxViews, AnyModel } from '../types'
import validate, { isObject } from '../validate'
import { isComplexObject } from '../utils'
/**
 * ICompare is tree structure, view is store view arguments and result
 *
 * tree structure
 * 1. first element is tree root
 * 2. map key is tree node
 * 3. map value is object {children: {xx:xx}}, xx is point other tree node(map key)
 *
 * view tree structure
 * 1. map key is view function
 * 2. map value is Map<arguments, result>
 */
interface ICompare {
	tree: Map<
		Record<string, any>,
		{
			children: Record<string, any>
		}
	>
	view: Map<Function, any>
}

export const isProxy = Symbol('__isProxy')
export const getTarget = Symbol('__target')

function createProxyObjFactory() {
	const proxyObjMap = new WeakMap<Record<string, any>, typeof Proxy>()
	return function createProxyObj(
		target: Record<string | symbol, any>,
		collection: typeof getStateCollection
	) {
		if (target[isProxy]) {
			return target
		}
		if (proxyObjMap.has(target)) {
			return proxyObjMap.get(target)
		}

		const proxy = new Proxy(target, collection())
		proxyObjMap.set(target, proxy)
		return proxy
	}
}

/**
 *
 * @param prevObj
 * @param compareObj
 * @param tree
 * @returns true: need computed, false: don't need computed, and use cached value
 */
// @ts-ignore
function compareObject(prevObj: any, nextObj: any, compare: ICompare) {
	if (!isComplexObject(prevObj)) {
		// $state function and view fucntion comparison
		if (typeof prevObj === 'function') {
			// const treeMap = compare.tree.get(prevObj)
			// $state function comparison
			// if (treeMap) {
			// 	const child = treeMap!.children
			// 	const nextChild = nextObj()
			// 	if (!isComplexObject(child)) {
			// 		return child === nextChild
			// 	}
			// 	return compareObject(child, nextChild, compare)
			// }

			// view compare, call function and compare result
			const viewValue = compare.view.get(prevObj)
			if (prevObj() !== viewValue) {
				return false
			}
		}
		// simple value like string number just call ===
		return prevObj === nextObj
	} else if (prevObj === nextObj) {
		// Object address has not changed, children are same
		return true
	}

	const treeNode = compare.tree.get(prevObj)
	if (!treeNode) {
		// not visit prevObj any key, just compare with ===
		return prevObj === nextObj
	}
	const child = treeNode!.children
	const keys = Object.keys(child)
	for (let i = 0; i < keys.length; i++) {
		const key = keys[i]
		const childObj = child[key]
		if (!compareObject(childObj, nextObj[key], compare)) {
			return false
		}
	}
	return true
}

/**
 * compare is arguments changed
 * @param next current arguments
 * @param compare previous arguments, store as a tree, and collect what keys been used
 * @returns false => need recomputed, true => use cache value
 */
function compareArguments(next: any, compare: ICompare) {
	const tree = compare.tree
	const root = Array.from(tree.keys())[0] // the Map first is tree root
	if (!root) {
		// use nothings
		return true
	}
	return compareObject(root, next, compare)
}

const stateCreateProxyObj = createProxyObjFactory()

let compareStatePos: ICompare

/**
 * if object value is Proxy return origin value
 * @param obj any obj, Proxy(origin object) or {xxx: Proxy(origin object)}
 * @returns origin object or {xxx: origin object}
 */
const getRawValueDeep = (obj: any) => {
	if (!isComplexObject(obj)) {
		return obj
	}
	obj = obj[isProxy] ? obj[getTarget] : obj
	const keys = Object.keys(obj)
	keys.forEach((key) => {
		if (key !== '$state') {
			;(obj as Record<string, any>)[key] = getRawValueDeep(obj[key])
		} else {
			Object.defineProperty(obj, '$state', {
				enumerable: true,
				configurable: true,
				value: getRawValueDeep(obj[key]),
			})
		}
	})
	return obj
}

let isCollectionKeys = false

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
					const view = result
					const previousPos = compareStatePos

					// call view fn
					let res = view()
					// if child views fn call, go on collects current scope used keys
					isCollectionKeys = true
					compareStatePos = previousPos
					const compareView = compareStatePos.view
					const viewNode = compareView.get(view)
					if (!viewNode) {
						compareView.set(view, res)
					} else {
						viewNode.set(res)
					}
					return res
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

function cacheView(
	fn: (...args: any[]) => any
	// _modelName: string, // just for debugging
	// _viewsKey: any // just for debugging
) {
	const thisCompare: ICompare = {
		tree: new Map(),
		view: new Map(),
	}

	let viewWithCache = createCache(
		(thisPoint) => {
			compareStatePos = thisCompare

			// reset compare
			resetCompare()

			const thisPointProxy = stateCreateProxyObj(thisPoint, getStateCollection)

			isCollectionKeys = true // just keep collection keys when fn call
			let res = fn.apply(thisPointProxy)
			isCollectionKeys = false
			// console.log(
			// 	'modelName=>',
			// 	_modelName,
			// 	_viewsKey,
			// 	thisCompare
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
			equalityCheck: (_prev: any, next: any) => {
				// stateCompare
				return compareArguments(next, thisCompare)
			},
		}
	)
	let originClearCache = viewWithCache.clearCache
	viewWithCache.clearCache = function () {
		compareStatePos = thisCompare
		resetCompare()
		originClearCache()
	}
	return viewWithCache
}

function resetCompare() {
	compareStatePos.tree.clear()
	compareStatePos.view.clear()
}

export const createViews = <IModel extends AnyModel>(
	redoxStore: RedoxStore<IModel>
): void => {
	const model = redoxStore.model
	const views = model.views
	if (views) {
		if (process.env.NODE_ENV === 'development') {
			validate(() => [
				[
					!isObject(views),
					`model.views should be object, now is ${typeof views}`,
				],
			])
		}
		const proxyObj = {} as RedoxViews<IModel['views']>
		;(Object.keys(views) as Array<keyof IModel['views']>).forEach(
			(viewsKey) => {
				const newView = cacheView(
					views[viewsKey]
					// model.name || '',
					// viewsKey
				)
				// @ts-ignore
				proxyObj[viewsKey] = function () {
					const state = redoxStore.getState()
					const view = redoxStore.$views
					const selfStateAndView = Object.assign({}, state, view)
					// generate dependsState by dependencies
					let dependsStateAndView = {} as Record<string, any>
					const depends = model._depends
					if (depends) {
						depends.forEach((depend) => {
							const dependRedoxStore = redoxStore._cache._getRedox(depend)
							const dependStore = Object.assign(
								{},
								dependRedoxStore.getState(),
								dependRedoxStore.$views
							)
							Object.defineProperty(dependStore, '$state', {
								enumerable: true,
								configurable: true,
								get() {
									return dependRedoxStore.getState()
								},
							})
							dependsStateAndView[depend.name] = dependStore
						})
					}
					const thisPoint = {
						...selfStateAndView,
						$dep: dependsStateAndView,
					}
					Object.defineProperty(thisPoint, '$state', {
						enumerable: true,
						configurable: true,
						get() {
							return redoxStore.getState()
						},
					})
					return newView(thisPoint)
				}
			}
		)
		redoxStore.$views = proxyObj
	}
}

export function createSelector(fn: (...args: any[]) => any) {
	const stateAndViewsCompare: ICompare = {
		tree: new Map(),
		view: new Map(),
	}

	let selectorWithCache = createCache(
		(stateAndViews: any) => {
			compareStatePos = stateAndViewsCompare

			// reset compare
			resetCompare()

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
	let originClearCache = selectorWithCache.clearCache
	selectorWithCache.clearCache = function () {
		compareStatePos = stateAndViewsCompare
		resetCompare()
		originClearCache()
	}
	return selectorWithCache
}
