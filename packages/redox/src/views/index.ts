import type { RedoxStore } from '../redoxStore'
import { createSelector } from './createSelector'
import { RedoxViews, AnyModel } from '../types'
import validate, { isObject } from '../validate'

const objectToString = Object.prototype.toString

function isComplexObject(obj: any): boolean {
	return objectToString.call(obj) === '[object Object]' || Array.isArray(obj)
}

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
export interface ICompare {
	tree: Map<
		Record<string, any>,
		{
			children: Record<string, any>
		}
	>
	view: Map<Function, Map<any[], any>>
}

const isProxy = Symbol('__isProxy')
const getTarget = Symbol('__target')

export function createProxyObjFactory() {
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
			const treeMap = compare.tree.get(prevObj)
			// $state function comparison
			if (treeMap) {
				const child = treeMap!.children
				const nextChild = nextObj()
				if (!isComplexObject(child)) {
					return child === nextChild
				}
				return compareObject(child, nextChild, compare)
			}

			// view compare, call function with arguments and compare result
			const viewMap = compare.view.get(prevObj)
			if (viewMap) {
				for (const [viewArg, viewRes] of viewMap.entries()) {
					if (prevObj(...viewArg) !== viewRes) {
						return false
					}
				}
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
export function compareArguments(next: any, compare: ICompare) {
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
export const getRawValueDeep = (obj: any) => {
	if (!isComplexObject(obj)) {
		return obj
	}
	obj = obj[isProxy] ? obj[getTarget] : obj
	const keys = Object.keys(obj)
	keys.forEach((key) => {
		return ((obj as Record<string, any>)[key] = getRawValueDeep(obj[key]))
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
						const previousPos = compareStatePos
						result = function (...args: any[]) {
							// call view fn
							let res = view(...args)
							// if child views fn call, go on collects current scope used keys
							isCollectionKeys = true
							compareStatePos = previousPos
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

function cacheFactory(
	fn: (...args: any[]) => any
	// _modelName: string, // just for debugging
	// _viewsKey: any // just for debugging
) {
	const thisCompare: ICompare = {
		tree: new Map(),
		view: new Map(),
	}

	return createSelector(
		(thisPoint, otherArgs) => {
			// reset compare
			thisCompare.tree.clear()
			for (const view of thisCompare.view.values()) {
				view.clear()
			}
			thisCompare.view.clear()

			compareStatePos = thisCompare
			const thisPointProxy = stateCreateProxyObj(thisPoint, getStateCollection)

			let tempOtherArgs = otherArgs

			isCollectionKeys = true // just keep collection keys when fn call
			let res = fn.apply(thisPointProxy, tempOtherArgs)
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
			equalityCheck: (prev: any, next: any, argsIndex: number) => {
				if (argsIndex === 0) {
					// stateCompare
					return compareArguments(next, thisCompare)
				} else if (argsIndex === 1) {
					// otherArgsCompare
					if (prev.length !== next.length) {
						return false
					}
					const len = prev.length
					for (let i = 0; i < len; i++) {
						if (prev[i] !== next[i]) {
							return false
						}
					}
				}
				return true
			},
		}
	)
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
				const cacheFun = cacheFactory(
					views[viewsKey]
					// model.name || '',
					// viewsKey
				)
				// @ts-ignore
				proxyObj[viewsKey] = function (...args: any[]) {
					const state = redoxStore.getState()
					const view = redoxStore.$views
					const selfStateAndView = Object.assign(
						Object.create(null),
						state,
						view
					)
					// generate dependsState by dependencies
					let dependsStateAndView = {} as Record<string, any>
					const depends = model._depends
					if (depends) {
						depends.forEach((depend) => {
							const tempDependStateAndView = {}
							const dependRedoxStore = redoxStore._cache._getRedox(depend)
							dependsStateAndView[depend.name] = Object.assign(
								tempDependStateAndView,
								{
									$state: dependRedoxStore.getState,
								},
								dependRedoxStore.getState(),
								dependRedoxStore.$views
							)
						})
					}
					const thisPoint = {
						...selfStateAndView,
						$dep: dependsStateAndView,
						$state: redoxStore.getState,
					}
					return cacheFun(thisPoint, args)
				}
			}
		)
		redoxStore.$views = proxyObj
	}
}
