import React, {
  createContext,
  useContext,
  PropsWithChildren,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { redox } from '@shuvi/redox'
import type { RedoxStore, AnyModel, RedoxOptions, Selector } from '@shuvi/redox'
import { createUseModel, createUseStaticModel } from './createUseModel'
import { createBatchManager } from './batchManager'
import { IUseModel, IUseStaticModel } from './types'
import { invariant } from './utils'

const createContainer = function (options?: RedoxOptions) {
  const Context = createContext<{
    redoxStore: RedoxStore
    batchManager: ReturnType<typeof createBatchManager>
  }>(null as any)
  function Provider(props: PropsWithChildren<{ store?: RedoxStore }>) {
    const { children, store: propsStore } = props

    const memoContext = useMemo(
      function () {
        let redoxStore: RedoxStore
        if (propsStore) {
          redoxStore = propsStore
        } else {
          redoxStore = redox(options)
        }
        const batchManager = createBatchManager()

        return {
          redoxStore,
          batchManager,
        }
      },
      [propsStore]
    )

    const [contextValue, setContextValue] = useState(memoContext) // for hmr keep contextValue

    useEffect(
      function () {
        setContextValue(memoContext)
      },
      [propsStore]
    )

    return <Context.Provider value={contextValue}>{children}</Context.Provider>
  }

  const useSharedModel: IUseModel = <
    IModel extends AnyModel,
    S extends Selector<IModel>
  >(
    model: IModel,
    selector?: S,
    depends?: any[]
  ) => {
    const context = useContext(Context)

    invariant(model.name, 'name is required.')
    invariant(
      context,
      'You should wrap your Component in createContainer().Provider.'
    )

    const { redoxStore, batchManager } = context

    return useMemo(
      () => createUseModel(redoxStore, batchManager),
      [redoxStore, batchManager]
    )(model, selector, depends)
  }

  const useStaticModel: IUseStaticModel = <IModel extends AnyModel>(
    model: IModel
  ) => {
    const context = useContext(Context)

    invariant(model.name, 'name is required.')
    invariant(
      context,
      'You should wrap your Component in createContainer().Provider.'
    )

    const { redoxStore, batchManager } = context

    return useMemo(
      () => createUseStaticModel(redoxStore, batchManager),
      [redoxStore, batchManager]
    )(model)
  }

  return {
    Provider,
    useSharedModel,
    useStaticModel,
  }
}

const {
  Provider: RedoxRoot,
  useSharedModel: useRootModel,
  useStaticModel: useRootStaticModel,
} = createContainer()

export { RedoxRoot, useRootModel, useRootStaticModel }

export default createContainer
