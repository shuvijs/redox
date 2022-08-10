import type { InternalModel } from '../../internalModel'
import { RedoxCacheValue } from '../types'
import { createCache } from './createCache'
import { RedoxViews, AnyModel } from '../../types'
import validate from '../../validate'
import { isPlainObject } from '../../utils'

function isComplexObject(val: unknown): boolean {
  return isPlainObject(val) || Array.isArray(val)
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
interface ICompare {
  tree: Map<
    Record<string, any>,
    {
      children: Record<string, any>
    }
  >
  view: Map<Function, any>
}

const isProxy = Symbol('__isProxy')
// const getTarget = Symbol('__target')

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

let isCollectionKeys = false

const getStateCollection = () => {
  return {
    get(target: any, p: string | symbol): any {
      if (p === isProxy) return true
      // if (p === getTarget) return target
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
      }
      // OwnProperty function should be a $state or view
      if (typeof result === 'function' && target.hasOwnProperty(p)) {
        const view = result
        // if view result cacheView, return cache
        if (view._isCached) {
          return view()
        }
        const previousPos = compareStatePos
        const previousCollectionStatus = isCollectionKeys
        // call view fn
        let res = view()
        // if child views fn call, go on collects current scope used keys
        if (previousCollectionStatus) {
          isCollectionKeys = true
          compareStatePos = previousPos
          const compareView = compareStatePos.view
          const viewNode = compareView.get(view)
          if (!viewNode) {
            compareView.set(view, res)
          } else {
            viewNode.set(res)
          }
        }
        // cache view result
        const cacheView = function () {
          return res
        }
        cacheView._isCached = true
        // overwrite to function for not collected view's result any more
        target[p] = cacheView
        return res
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
  $views: RedoxViews<IModel['views']>,
  internalModelInstance: InternalModel<IModel>,
  getCacheValue: (m: AnyModel) => RedoxCacheValue
): void => {
  const views = internalModelInstance.model.views
  if (!views) {
    return
  }
  if (views) {
    if (process.env.NODE_ENV === 'development') {
      validate(() => [
        [
          !isPlainObject(views),
          `model.views should be object, now is ${typeof views}`,
        ],
      ])
    }
    ;(Object.keys(views) as Array<keyof IModel['views']>).forEach(
      (viewsKey) => {
        const newView = cacheView(
          views[viewsKey]
          // model.name || '',
          // viewsKey
        )
        // @ts-ignore
        $views[viewsKey] = function () {
          // generate dependsState by dependencies
          let dependsStateAndView = {} as Record<string, any>
          const depends = internalModelInstance.model._depends
          if (depends) {
            depends.forEach((depend) => {
              const { internalModelInstance: instance, publicApi } =
                getCacheValue(depend)
              const state = instance.getState()
              const { $views } = publicApi
              const res = Object.assign({}, state, $views, {
                $state: state,
              })
              dependsStateAndView[depend.name] = res
            })
          }
          const { internalModelInstance: instance, publicApi } = getCacheValue(
            internalModelInstance.model
          )
          const state = instance.getState()
          const { $views } = publicApi
          const thisPoint = Object.assign({}, state, $views, {
            $dep: dependsStateAndView,
            $state: state,
          })
          return newView(thisPoint)
        }
      }
    )
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
