import { isPlainObject, hasOwn, hasChanged, emptyObject } from '../utils'
import { AnyModel } from './defineModel'
import { Views, EmptyObject } from './modelOptions'
import { ModelInternal } from './model'
import { warn } from '../warning'
import { reactive } from '../reactivity/reactive'
import { view } from '../reactivity/view'

export type SelectorParams<Model extends AnyModel> = {
  $state: Model['state']
} & Model['state'] &
  Views<Model['views']> &
  EmptyObject

export type Selector<Model extends AnyModel, TReturn = any> = (
  stateAndViews: SelectorParams<Model>
) => TReturn

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
      return instanceViews[key]
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
  instance: ModelInternal<IModel>,
  getCacheValue: (m: AnyModel) => ModelInternal
): void => {
  const views = instance.options.views
  if (!views) {
    return
  }

  const $views = instance.views
  ;(Object.keys(views) as Array<keyof IModel['views']>).forEach((viewKey) => {
    // generate depends context
    const dependsStructure: Record<string, any> = {}
    const dependState: Record<string, any> = {}
    const depends = instance.options._depends
    if (depends) {
      for (const depend of Object.values(depends)) {
        // generate depend ref
        const dependRef = {
          [$VALUE_REF]: emptyObject,
          [VALUE_REF]: emptyObject,
          [PREV_STATE]: emptyObject,
        }
        dependState[depend.name as string] = dependRef
        const depInstance = getCacheValue(depend)
        dependsStructure[depend.name as string] = new Proxy(emptyObject, {
          get: createGetter(dependRef, depInstance.proxy!.$views),
          set: proxySetter,
        })
      }
    }
    // generate this ref context
    const currentModelProxy = {
      [$VALUE_REF]: emptyObject,
      [VALUE_REF]: emptyObject,
      [PREV_STATE]: emptyObject,
      [DEP_REF]: dependsStructure,
    }
    // view function
    const fn = views[viewKey]
    let thisRefProxy = new Proxy(emptyObject, {
      get: createGetter(currentModelProxy, $views),
      set: proxySetter,
    })
    // result view
    const viewRes = view(() => {
      const prevState = currentModelProxy[PREV_STATE]
      const nextState = instance.getState()
      // check is the state changed
      if (hasChanged(prevState, nextState)) {
        currentModelProxy[PREV_STATE] = nextState
        currentModelProxy[$VALUE_REF] = reactive(() => {
          return { $state: instance.getState() }
        })
        // if state is not a object, no need create reactive object
        if (isPlainObject(nextState)) {
          currentModelProxy[VALUE_REF] = reactive(() => {
            // reactive will be store to weakMap target=>Fn
            // view context is independent of each other
            // return new object the context is unique
            return { ...instance.getState() }
          })
        } else {
          currentModelProxy[VALUE_REF] = emptyObject
        }
      }
      // depends is sa same as this ref
      const depends = instance.options._depends
      if (depends) {
        for (const depend of Object.values(depends)) {
          const depInstance = getCacheValue(depend)
          const dependRef = dependState[depend.name as string]
          const prevState = dependRef[PREV_STATE]
          const nextState = depInstance.getState()
          if (hasChanged(prevState, nextState)) {
            dependRef[PREV_STATE] = nextState
            dependRef[$VALUE_REF] = reactive(() => {
              return { $state: depInstance.getState() }
            })
            if (isPlainObject(nextState)) {
              dependRef[VALUE_REF] = reactive(() => {
                return { ...depInstance.getState() }
              })
            } else {
              dependRef[VALUE_REF] = emptyObject
            }
          }
        }
      }
      return fn.call(thisRefProxy)
    })

    Object.defineProperty($views, viewKey, {
      configurable: true,
      enumerable: true,
      get() {
        return viewRes.value
      },
      set() {
        if (process.env.NODE_ENV === 'development') {
          warn(`cannot change view property '${String(viewKey)}'`)
        }
        return false
      },
    })
  })
}

export function createSelector<IModel extends AnyModel, TReturn>(
  instance: ModelInternal<IModel>,
  selector: Selector<IModel, TReturn>
) {
  let currentModelProxy = {
    [$VALUE_REF]: emptyObject,
    [VALUE_REF]: emptyObject,
    [PREV_STATE]: emptyObject,
  }

  let proxyRef = new Proxy(emptyObject, {
    get: createGetter(currentModelProxy, instance.proxy!.$views),
    set: proxySetter,
  })
  let viewRes = view(() => {
    const prevState = currentModelProxy[PREV_STATE]
    const nextState = instance.getState()
    if (hasChanged(prevState, nextState)) {
      currentModelProxy[PREV_STATE] = nextState
      currentModelProxy[$VALUE_REF] = reactive(() => {
        return { $state: instance.getState() }
      })
      if (isPlainObject(nextState)) {
        currentModelProxy[VALUE_REF] = reactive(() => {
          return { ...instance.getState() }
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
