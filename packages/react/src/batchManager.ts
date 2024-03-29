import { unstable_batchedUpdates } from 'react-dom'
import type { AnyModel, RedoxStore } from '@shuvi/redox'

const createBatchManager = () => {
  // store models which is using now
  const modelBindRender = new WeakMap<AnyModel, Set<() => void>>()
  const redoxStoreUnSub = new WeakMap<AnyModel, () => void>()

  // add models to listen
  const addSubscribe = function (
    model: AnyModel,
    redoxStore: RedoxStore,
    fn: () => void
  ) {
    let modelsFnSet = modelBindRender.get(model)
    if (!modelsFnSet) {
      modelsFnSet = new Set()
      modelsFnSet.add(fn)
      const unSubscribe = redoxStore.subscribe(model, function () {
        triggerSubscribe(model) // render self;
      })
      modelBindRender.set(model, modelsFnSet)
      redoxStoreUnSub.set(model, unSubscribe)
    } else {
      modelsFnSet.add(fn)
    }
    return function () {
      return removeSubscribe(model, fn)
    }
  }

  // remove models to listen
  const removeSubscribe = function (model: AnyModel, fn: () => void) {
    let modelsFnSet = modelBindRender.get(model)
    if (modelsFnSet) {
      modelsFnSet.delete(fn)
      if (modelsFnSet.size === 0 && redoxStoreUnSub.has(model)) {
        modelBindRender.delete(model)
        const UnSubFn = redoxStoreUnSub.get(model)
        if (UnSubFn) {
          UnSubFn()
          redoxStoreUnSub.delete(model)
        }
      }
    }
  }

  // listen to models in using
  const triggerSubscribe = function (model: AnyModel) {
    const updateList: (() => void)[] = Array.from(
      modelBindRender.get(model) || []
    )

    unstable_batchedUpdates(() => {
      let update: (() => void) | undefined = updateList.pop()

      while (update) {
        update()

        update = updateList.pop()
      }
    })
  }

  return {
    addSubscribe,
    triggerSubscribe,
  }
}

export { createBatchManager }
