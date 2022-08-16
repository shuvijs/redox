import { AnyModel } from './defineModel'
import { Views, Selector } from './modelOptions'
import { RedoxModel } from './redox'
import type { Model } from './model'
import { isPlainObject, hasOwn, hasChanged, emptyObject } from '../utils'
import { warn } from '../warning'
import { reactive } from '../reactivity/reactive'
import { view } from '../reactivity/view'

// fot access state by this.$state.x
const $VALUE_REF = '$valueRef'
// fot access state by this.x
const VALUE_REF = 'valueRef'
// store prev state ref
const PREV_STATE = 'prevRef'
// access this.$dep
const DEP_REF = 'depRef'

function createGetter<IModel extends AnyModel>(
  instanceProxy: Record<string, any>,
  instanceViews: Views<IModel['views']>
) {
  return function get(
    target: Record<string | symbol, any>,
    key: string | symbol
  ) {
    // access state by this.$state
    if (key === '$state') {
      return instanceProxy[$VALUE_REF][key]
    }
    // access property by this.x
    if (hasOwn(instanceProxy[VALUE_REF], key)) {
      return instanceProxy[VALUE_REF][key]
    }
    // access depends by this.$dep
    if (key === '$dep' && hasOwn(instanceProxy, DEP_REF)) {
      return instanceProxy[DEP_REF]
    }
    // access view by this.view
    if (hasOwn(instanceViews, key)) {
      const view = instanceViews[key]
      return view()
    }
    return target[key]
  }
}

function proxySetter(_newValue: any) {
  if (process.env.NODE_ENV === 'development') {
    warn('cannot change state in view function')
  }
  return false
}

export const createViews = <IModel extends AnyModel>(
  $views: Views<IModel['views']>,
  internalModelInstance: Model<IModel>,
  getCacheValue: (m: AnyModel) => RedoxModel
): void => {
  const views = internalModelInstance.options.views
  if (!views) {
    return
  }

  ;(Object.keys(views) as Array<keyof IModel['views']>).forEach((viewsKey) => {
    // generate depends context
    const dependsStructure: Record<string, any> = {}
    const dependState: Record<string, any> = {}
    const depends = internalModelInstance.options._depends
    if (depends) {
      depends.forEach((depend) => {
        // generate depend ref
        const dependRef = {
          [$VALUE_REF]: emptyObject,
          [VALUE_REF]: emptyObject,
          [PREV_STATE]: emptyObject,
        }
        dependState[depend.name as string] = dependRef
        const { publicApi } = getCacheValue(depend)
        dependsStructure[depend.name as string] = new Proxy(emptyObject, {
          get: createGetter(dependRef, publicApi.$views),
          set: proxySetter,
        })
      })
    }
    // generate this ref context
    const currentModelProxy = {
      [$VALUE_REF]: emptyObject,
      [VALUE_REF]: emptyObject,
      [PREV_STATE]: emptyObject,
      [DEP_REF]: dependsStructure,
    }
    // view function
    const fn = views[viewsKey]
    let thisRefProxy = new Proxy(emptyObject, {
      get: createGetter(currentModelProxy, $views),
      set: proxySetter,
    })
    // result view
    const viewRes = view(() => {
      const prevState = currentModelProxy[PREV_STATE]
      const nextState = internalModelInstance.getState()
      // check is the state changed
      if (hasChanged(prevState, nextState)) {
        currentModelProxy[PREV_STATE] = nextState
        currentModelProxy[$VALUE_REF] = reactive(() => {
          return { $state: internalModelInstance.getState() }
        })
        // if state is not a object, no need create reactive object
        if (isPlainObject(nextState)) {
          currentModelProxy[VALUE_REF] = reactive(() => {
            // reactive will be store to weakMap target=>Fn
            // view context is independent of each other
            // return new object the context is unique
            return { ...internalModelInstance.getState() }
          })
        } else {
          currentModelProxy[VALUE_REF] = emptyObject
        }
      }
      // depends is sa same as this ref
      const depends = internalModelInstance.options._depends
      if (depends) {
        depends.forEach((depend) => {
          const { internalModelInstance: instance } = getCacheValue(depend)
          const dependRef = dependState[depend.name as string]
          const prevState = dependRef[PREV_STATE]
          const nextState = instance.getState()
          if (hasChanged(prevState, nextState)) {
            dependRef[PREV_STATE] = nextState
            dependRef[$VALUE_REF] = reactive(() => {
              return { $state: instance.getState() }
            })
            if (isPlainObject(nextState)) {
              dependRef[VALUE_REF] = reactive(() => {
                return { ...instance.getState() }
              })
            } else {
              dependRef[VALUE_REF] = emptyObject
            }
          }
        })
      }
      return fn.call(thisRefProxy)
    })
    // @ts-ignore
    $views[viewsKey] = function () {
      return viewRes.value
    }
  })
}

export function createSelector<IModel extends AnyModel, TReturn>(
  internalModelInstance: Model<IModel>,
  getCacheValue: (m: AnyModel) => RedoxModel,
  selector: Selector<IModel, TReturn>
) {
  let currentModelProxy = {
    [$VALUE_REF]: emptyObject,
    [VALUE_REF]: emptyObject,
    [PREV_STATE]: emptyObject,
  }

  const { publicApi } = getCacheValue(internalModelInstance.options)

  let proxyRef = new Proxy(emptyObject, {
    get: createGetter(currentModelProxy, publicApi.$views),
    set: proxySetter,
  })
  let viewRes = view(() => {
    const prevState = currentModelProxy[PREV_STATE]
    const nextState = internalModelInstance.getState()
    if (hasChanged(prevState, nextState)) {
      currentModelProxy[PREV_STATE] = nextState
      currentModelProxy[$VALUE_REF] = reactive(() => {
        return { $state: internalModelInstance.getState() }
      })
      if (isPlainObject(nextState)) {
        currentModelProxy[VALUE_REF] = reactive(() => {
          return { ...internalModelInstance.getState() }
        })
      } else {
        currentModelProxy[VALUE_REF] = emptyObject
      }
    }
    return selector.call(null, proxyRef)
  })
  const res = function () {
    return viewRes.value
  }
  res.clearCache = function () {
    proxyRef = null
    viewRes.effect.stop()
    viewRes = null as any
    currentModelProxy = null as any
  }
  return res
}
