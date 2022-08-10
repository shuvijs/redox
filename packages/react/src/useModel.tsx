import { useMemo, useRef } from 'react'
import { redox, validate } from '@shuvi/redox'
import type { AnyModel, ISelector } from '@shuvi/redox'
import { createBatchManager } from './batchManager'
import { createUseModel } from './createUseModel'
import { IUseModel } from './types'

const useModel: IUseModel = <
  IModel extends AnyModel,
  Selector extends ISelector<IModel>
>(
  model: IModel,
  selector?: Selector,
  depends?: any[]
) => {
  if (process.env.NODE_ENV === 'development') {
    validate(() => [[!Boolean(model), `useModel param model is necessary`]])
  }

  let [redoxStore, batchManager] = useMemo(function () {
    return [redox(), createBatchManager()]
  }, [])

  const contextValue = useRef({
    redoxStore,
    batchManager,
  })

  return useMemo(
    function () {
      return createUseModel(
        contextValue.current.redoxStore,
        contextValue.current.batchManager
      )
    },
    [contextValue.current.redoxStore, contextValue.current.batchManager]
  )(model, selector, depends)
}

export { useModel }
