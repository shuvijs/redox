import { useDebugValue, useMemo, useRef } from 'react'
import {
  RedoxStore,
  AnyModel,
  Selector,
  ModelView,
  ModelPublicInstance,
  hasOwn,
} from '@shuvi/redox'
import { useSyncExternalStore } from 'use-sync-external-store/shim'
import { createBatchManager } from './batchManager'

function readonlyModel(model: ModelPublicInstance<AnyModel>) {
  return new Proxy(model, {
    get(target: ModelPublicInstance<AnyModel>, key: string | symbol): any {
      if (key === '$state') {
        return target.$state
      } else if (hasOwn(target.$state, key)) {
        return target.$state[key]
      } else if (hasOwn(target.$views, key)) {
        return target.$views[key]
      }

      return undefined
    },
    set() {
      console.warn(`try to change state which is not allowed!`)
      return false
    },
  })
}

function useModel<IModel extends AnyModel, S extends Selector<IModel>>(
  redoxStore: RedoxStore,
  batchManager: ReturnType<typeof createBatchManager>,
  model: IModel
) {
  const { modelInstance, subscribe } = useMemo(
    () => {
      return {
        modelInstance: redoxStore.getModel(model),
        subscribe: (onModelChange: () => void) =>
          batchManager.addSubscribe(model, redoxStore, onModelChange),
      }
    },
    // ignore model's change
    [redoxStore]
  )

  const view = useMemo(
    () => () => modelInstance.$getSnapshot(),
    [modelInstance]
  )

  const state = useSyncExternalStore<ReturnType<S>>(subscribe, view, view)

  useDebugValue(state)

  return [state, modelInstance.$actions] as [any, any]
}

function useModelWithSelector<
  IModel extends AnyModel,
  S extends Selector<IModel>
>(
  redoxStore: RedoxStore,
  batchManager: ReturnType<typeof createBatchManager>,
  model: IModel,
  selector: S,
  depends?: any[]
) {
  const { modelInstance, subscribe } = useMemo(
    () => {
      return {
        modelInstance: redoxStore.getModel(model),
        subscribe: (onModelChange: () => void) =>
          batchManager.addSubscribe(model, redoxStore, onModelChange),
      }
    },
    // ignore model's change
    [redoxStore]
  )
  const selectorRef = useRef<undefined | ModelView>(undefined)

  const view = useMemo(() => {
    let preMv: ModelView | undefined = selectorRef.current
    let mv: ModelView
    if (preMv) {
      preMv.destory()
    }

    mv = selectorRef.current = modelInstance.$createSelector(selector)

    return mv
  }, [modelInstance, ...(depends ? depends : [selector])])

  const state = useSyncExternalStore<ReturnType<S>>(subscribe, view, view)

  useDebugValue(state)

  return [state, modelInstance.$actions] as [any, any]
}

export const createUseModel =
  (
    redoxStore: RedoxStore,
    batchManager: ReturnType<typeof createBatchManager>
  ) =>
  <IModel extends AnyModel, S extends Selector<IModel>>(
    model: IModel,
    selector?: S,
    depends?: any[]
  ) => {
    const hasSelector = useRef(selector)

    // todo: warn when hasSelector changes
    if (hasSelector.current) {
      return useModelWithSelector(
        redoxStore,
        batchManager,
        model,
        selector!,
        depends
      )
    } else {
      return useModel(redoxStore, batchManager, model)
    }
  }

export const createUseStaticModel =
  (
    redoxStore: RedoxStore,
    _batchManager: ReturnType<typeof createBatchManager>
  ) =>
  <IModel extends AnyModel>(model: IModel) => {
    const modelInstance = useMemo(
      () => redoxStore.getModel(model),
      // ignore model's change
      [redoxStore]
    )
    const value = useRef<any>()

    // only run this once against a model
    const stateRef = useMemo(() => {
      return {
        get current() {
          if (process.env.NODE_ENV === 'development') {
            return readonlyModel(modelInstance)
          } else {
            return modelInstance
          }
        },
      }
    }, [modelInstance])

    value.current = stateRef

    return [value.current, modelInstance.$actions] as [any, any]
  }
