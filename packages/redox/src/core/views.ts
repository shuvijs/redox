import { AnyModel, RedoxViews, ISelector } from '../types'
import { RedoxCacheValue } from './types'
import type { InternalModel } from '../internalModel'
import validate from '../validate'
import { isPlainObject, hasOwn } from '../utils'
import { warn } from '../warning'
import { reactive } from '../reactivity/reactive'
import { view } from '../reactivity/view'

const STATEREF = 'stateRef'
const DEPREF = 'depRef'
const SAMPLEOBJ = {}

function createGetter<IModel extends AnyModel>(
  instanceProxy: Record<string, any>,
  instanceViews: RedoxViews<IModel['views']>
) {
  return function get(
    target: Record<string | symbol, any>,
    key: string | symbol
  ) {
    if (hasOwn(instanceProxy[STATEREF], key)) {
      return instanceProxy[STATEREF][key]
    }
    if (key === '$dep' && hasOwn(instanceProxy, DEPREF)) {
      return instanceProxy[DEPREF]
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
          [STATEREF]: SAMPLEOBJ,
        }
        const { publicApi } = getCacheValue(depend)
        dependsStructure[depend.name as string] = new Proxy(SAMPLEOBJ, {
          get: createGetter(
            dependState[depend.name as string],
            publicApi.$views
          ),
          set: proxySetter,
        })
      })
    }
    const currentModelProxy = {
      [STATEREF]: SAMPLEOBJ,
      [DEPREF]: dependsStructure,
    }
    const fn = views[viewsKey]
    let thisRefProxy = new Proxy(SAMPLEOBJ, {
      get: createGetter(currentModelProxy, $views),
      set: proxySetter,
    })
    const viewRes = view(() => {
      currentModelProxy[STATEREF] = reactive(() => {
        const state = internalModelInstance.getState()
        return Object.assign({ $state: state }, state)
      })
      const depends = internalModelInstance.model._depends
      if (depends) {
        depends.forEach((depend) => {
          const { internalModelInstance: instance } = getCacheValue(depend)
          dependState[depend.name as string][STATEREF] = reactive(() => {
            const state = instance.getState()
            return Object.assign({ $state: state }, state)
          })
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
  const currentModelProxy = {
    [STATEREF]: SAMPLEOBJ,
  }

  const { publicApi } = getCacheValue(internalModelInstance.model)

  let thisRefProxy = new Proxy(SAMPLEOBJ, {
    get: createGetter(currentModelProxy, publicApi.$views),
    set: proxySetter,
  })
  let viewRes = view(() => {
    currentModelProxy[STATEREF] = reactive(() => {
      const state = internalModelInstance.getState()
      return Object.assign({ $state: state }, state)
    })
    return selector.call(null, thisRefProxy)
  })
  const res = function () {
    return viewRes.value
  }
  res.clearCache = function () {
    thisRefProxy = null
    viewRes.effect.stop()
    viewRes = null as any
  }
  return res
}
