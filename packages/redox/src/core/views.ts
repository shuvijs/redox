import { AnyModel, RedoxViews, ISelector } from '../types'
import { RedoxCacheValue } from './types'
import type { InternalModel } from '../internalModel'
import validate from '../validate'
import { isPlainObject, hasOwn, hasChanged } from '../utils'
import { warn } from '../warning'
import { reactive } from '../reactivity/reactive'
import { view } from '../reactivity/view'

const $VALUE_REF = '$valueRef'
const VALUE_REF = 'valueRef'
const PREV_STATE = 'prevRef'
const DEP_REF = 'depRef'
const SAMPLE_OBJ = {}

function createGetter<IModel extends AnyModel>(
  instanceProxy: Record<string, any>,
  instanceViews: RedoxViews<IModel['views']>
) {
  return function get(
    target: Record<string | symbol, any>,
    key: string | symbol
  ) {
    if (key === '$state') {
      return instanceProxy[$VALUE_REF][key]
    }
    if (hasOwn(instanceProxy[VALUE_REF], key)) {
      return instanceProxy[VALUE_REF][key]
    }
    if (key === '$dep' && hasOwn(instanceProxy, DEP_REF)) {
      return instanceProxy[DEP_REF]
    }
    if (hasOwn(instanceViews, key)) {
      const view = instanceViews[key]
      return view()
    }
    return target[key]
  }
}

function proxySetter(_newValue: any) {
  if (process.env.NODE_ENV === 'development') {
    warn('Write operation failed: computed value is readonly')
  }
  return false
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
  if (process.env.NODE_ENV === 'development') {
    validate(() => [
      [
        !isPlainObject(views),
        `model.views should be object, now is ${typeof views}`,
      ],
    ])
  }
  ;(Object.keys(views) as Array<keyof IModel['views']>).forEach((viewsKey) => {
    const dependsStructure: Record<string, any> = {}
    const dependState: Record<string, any> = {}
    const depends = internalModelInstance.model._depends
    if (depends) {
      depends.forEach((depend) => {
        dependState[depend.name as string] = {
          [$VALUE_REF]: SAMPLE_OBJ,
          [VALUE_REF]: SAMPLE_OBJ,
          [PREV_STATE]: SAMPLE_OBJ,
        }
        const { publicApi } = getCacheValue(depend)
        dependsStructure[depend.name as string] = new Proxy(SAMPLE_OBJ, {
          get: createGetter(
            dependState[depend.name as string],
            publicApi.$views
          ),
          set: proxySetter,
        })
      })
    }
    const currentModelProxy = {
      [$VALUE_REF]: SAMPLE_OBJ,
      [VALUE_REF]: SAMPLE_OBJ,
      [PREV_STATE]: SAMPLE_OBJ,
      [DEP_REF]: dependsStructure,
    }
    const fn = views[viewsKey]
    let thisRefProxy = new Proxy(SAMPLE_OBJ, {
      get: createGetter(currentModelProxy, $views),
      set: proxySetter,
    })
    const viewRes = view(() => {
      const prevState = currentModelProxy[PREV_STATE]
      const nextState = internalModelInstance.getState()
      if (hasChanged(prevState, nextState)) {
        currentModelProxy[PREV_STATE] = nextState
        currentModelProxy[$VALUE_REF] = reactive(() => {
          return { $state: internalModelInstance.getState() }
        })
        currentModelProxy[VALUE_REF] = reactive(() => {
          return internalModelInstance.getState()
        })
      }
      const depends = internalModelInstance.model._depends
      if (depends) {
        depends.forEach((depend) => {
          const { internalModelInstance: instance } = getCacheValue(depend)
          const prevState = dependState[depend.name as string][PREV_STATE]
          const nextState = instance.getState()
          if (hasChanged(prevState, nextState)) {
            dependState[depend.name as string][PREV_STATE] = nextState
            dependState[depend.name as string][$VALUE_REF] = reactive(() => {
              return { $state: instance.getState() }
            })
            dependState[depend.name as string][VALUE_REF] = reactive(() => {
              return instance.getState()
            })
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
  internalModelInstance: InternalModel<IModel>,
  getCacheValue: (m: AnyModel) => RedoxCacheValue,
  selector: ISelector<IModel, TReturn>
) {
  let currentModelProxy = {
    [$VALUE_REF]: SAMPLE_OBJ,
    [VALUE_REF]: SAMPLE_OBJ,
    [PREV_STATE]: SAMPLE_OBJ,
  }

  const { publicApi } = getCacheValue(internalModelInstance.model)

  let proxyRef = new Proxy(SAMPLE_OBJ, {
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
      currentModelProxy[VALUE_REF] = reactive(() => {
        return internalModelInstance.getState()
      })
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
