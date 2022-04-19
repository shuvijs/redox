import type { RedoxStore } from '../redoxStore'
import { createSelector } from './createSelector'
import { RedoxViews, AnyModel } from '../types'
import validate, { isObject } from '../validate'
import { getDependsState } from '../utils'

const objectToString = Object.prototype.toString

function isComplexObject(obj: any): boolean {
	return objectToString.call(obj) === '[object Object]' || Array.isArray(obj)
}

interface ICompare {
	tree: Map<
		Record<string, any>,
		{
			children: Record<string, any>
		}
	>
}

interface IViewsCompare {
	new: Map<string, any>
	isCollectionKeys: boolean
	stateCompare: ICompare
	rootStateCompare: ICompare
}

let isCollectionKeys = false

const getProxyHandler = (viewsCompare: IViewsCompare) => {
	const handler = {
		get: function (
			target: Record<string, (...args: any[]) => any>,
			prop: string
		) {
			let result = target[prop]
			if (typeof result === 'function') {
				result = result()
			}
			if (viewsCompare.isCollectionKeys) {
				if (!viewsCompare.new.has(prop)) {
					viewsCompare.new.set(prop, result)
				}
				// if child views fn call, go on collects current scope used keys
				isCollectionKeys = true
				compareStatePos = viewsCompare.stateCompare
				compareRootStatePos = viewsCompare.rootStateCompare
			}
			return result
		},
	}
	return handler
}

function createProxyObjFactory() {
	const proxyObjMap = new WeakMap<Record<string, any>, typeof Proxy>()
	return function createProxyObj(
		target: Record<string, any>,
		collection: typeof getStateCollection
	) {
		if (proxyObjMap.has(target)) {
			return proxyObjMap.get(target)
		}
		const proxy = new Proxy(target, collection())
		proxyObjMap.set(target, proxy)
		return proxy
	}
}

const stateCreateProxyObj = createProxyObjFactory()
const rootStateCreateProxyObj = createProxyObjFactory()

let compareStatePos: ICompare
const getStateCollection = () => {
	return {
		get(target: any, p: string): any {
			let result = target[p]
			if (isCollectionKeys) {
				const compareTree = compareStatePos.tree
				if (compareTree.has(target)) {
					const treeNode = compareTree.get(target)
					treeNode && (treeNode!.children[p] = result)
				} else {
					compareTree.set(target, {
						children: {
							[p]: result,
						},
					})
				}
			}
			if (isComplexObject(result)) {
				result = stateCreateProxyObj(result, getStateCollection)
			}
			return result
		},
	}
}

let compareRootStatePos: ICompare
const getRootStateCollection = () => {
	return {
		get(target: any, p: string): any {
			let result = target[p]
			if (isCollectionKeys) {
				const compareTree = compareRootStatePos.tree
				if (compareTree.has(target)) {
					const treeNode = compareTree.get(target)
					treeNode && (treeNode!.children[p] = result)
				} else {
					compareTree.set(target, {
						children: {
							[p]: result,
						},
					})
				}
			}
			if (isComplexObject(result)) {
				result = rootStateCreateProxyObj(result, getRootStateCollection)
			}
			return result
		},
	}
}

function createProxyViews(
	proxyObj: Record<string, (args: any) => any>,
	viewsCompare: IViewsCompare
) {
	return new Proxy<any>(proxyObj, getProxyHandler(viewsCompare))
}

function compareObject(obj: any, compareObj: any, tree: ICompare['tree']) {
	if (!isComplexObject(obj)) {
		return obj === compareObj
	} else if (obj === compareObj) {
		// Object address has not changed, children are same
		return true
	}
	if (!tree.has(obj)) {
		return true
	}
	const treeNode = tree.get(obj)
	const children = treeNode!.children
	const keys = Object.keys(children)
	for (let i = 0; i < keys.length; i++) {
		const key = keys[i]
		const childrenObj = children[key]
		if (!compareObject(childrenObj, compareObj[key], tree)) {
			return false
		}
	}
	return true
}

// return false => need recomputed, true => use last cache
function compareArguments(next: any, compare: ICompare) {
	const tree = compare.tree
	const root = Array.from(tree.keys())[0] // app get root object first so tree root is the Map first
	if (!root) {
		// use nothings
		return true
	}
	return compareObject(root, next, tree)
}

function cacheFactory(
	fn: (...args: any[]) => any,
	proxyObj: Record<string, (args: any) => any>
	// _modelName: string, // just for debugging
	// _viewsKey: any // just for debugging
) {
	const stateCompare = {
		tree: new Map(),
	}

	const rootStateCompare = {
		tree: new Map(),
	}

	const viewsCompare = {
		new: new Map<string, any>(),
		viewsProxy: {},
		isCollectionKeys: false,
		stateCompare,
		rootStateCompare,
		// name: `${_modelName}-${_viewsKey}`
	}

	viewsCompare.viewsProxy = createProxyViews(proxyObj, viewsCompare)

	return createSelector(
		(state, rootState, otherArgs) => {
			// reset compare
			stateCompare.tree.clear()
			rootStateCompare.tree.clear()
			viewsCompare.new.clear()

			compareStatePos = stateCompare
			const tempState = stateCreateProxyObj(state, getStateCollection)

			compareRootStatePos = rootStateCompare
			const tempRootStateProxy = rootStateCreateProxyObj(
				rootState,
				getRootStateCollection
			)

			let tempOtherArgs = otherArgs

			const tempViewsProxy = viewsCompare.viewsProxy

			isCollectionKeys = true // just keep collection keys when fn call
			viewsCompare.isCollectionKeys = true
			const res = fn.call(
				tempViewsProxy,
				tempState,
				tempRootStateProxy,
				tempOtherArgs
			)
			isCollectionKeys = false
			viewsCompare.isCollectionKeys = false
			// console.log(
			//   'modelName=>',
			//   _modelName,
			// 	_viewsKey,
			//   stateCompare,
			//   rootStateCompare,
			//   viewsCompare
			// );
			return res
		},
		{
			equalityCheck: (prev: any, next: any, argsIndex: number) => {
				let res = true
				if (argsIndex === 0) {
					// stateCompare
					res = compareArguments(next, stateCompare)
				} else if (argsIndex === 1) {
					// rootStateCompare
					res = compareArguments(next, rootStateCompare)
				} else if (argsIndex === 2) {
					// otherArgsCompare
					if (prev !== next) {
						res = false
					}
					if (res) {
						// viewsCompare
						const proxyKeysMap = viewsCompare.new
						const viewsProxy = viewsCompare.viewsProxy as Record<string, any>
						for (const [key, value] of proxyKeysMap.entries()) {
							if (value !== viewsProxy[key]) {
								res = false
								break
							}
						}
					}
				}
				return res
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
		validate(() => [
			[
				!isObject(views),
				`model.views should be object, now is ${typeof views}`,
			],
		])
		const proxyObj = {} as RedoxViews<IModel>
		;(Object.keys(views) as Array<keyof IModel['views']>).forEach(
			(viewsKey) => {
				const cacheFun = cacheFactory(views[viewsKey], proxyObj)
				// @ts-ignore
				proxyObj[viewsKey] = function (args?: any) {
					const state = redoxStore.$state()
					// generate dependsState by dependencies
					const dependsState = getDependsState(
						model._depends,
						redoxStore._cache
					)
					return cacheFun(state, dependsState, args)
				}
			}
		)
		redoxStore.$views = proxyObj
	}
}
