import { useEffect, useState, useMemo, useRef } from 'react'
import type { RedoxStore, AnyModel, Selector } from '@shuvi/redox'
import { createBatchManager } from './batchManager'
import { getStateActions } from './getStateActions'

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
    const selectorRef = useRef<
      undefined | ((() => ReturnType<S>) & { clearCache: () => void })
    >(undefined)

    const cacheFn = useMemo(
      function () {
        if (!selector) {
          return (selectorRef.current = undefined)
        }
        selectorRef.current = redoxStore
          .getModel(model)
          .$createSelector(selector)
        return selectorRef.current
      },
      /**
       * think about below case
       */
      // useModel(model, selector) => useCallback(selector)
      // useModel(model, selector, []) => useCallback(selector, [])
      // useModel(model, selector, [a,b]) => useCallback(selector, [a,b])
      [redoxStore, batchManager, ...(depends ? depends : [selector])]
    )

    useEffect(
      function () {
        return function () {
          cacheFn?.clearCache()
        }
      },
      [cacheFn]
    )

    const initialValue = useMemo(
      function () {
        return getStateActions(model, redoxStore, selectorRef.current)
      },
      [redoxStore, batchManager]
    )

    const [modelValue, setModelValue] = useState(initialValue)

    const lastValueRef = useRef<any>(initialValue)

    const isInit = useRef<boolean>(false)

    useEffect(
      function () {
        // useEffect is async, there's maybe some async update state before store subscribe
        // check state and actions once, need update if it changed
        isInit.current = true
        const newValue = getStateActions(model, redoxStore, selectorRef.current)
        if (
          // selector maybe return new object each time, compare value with shadowEqual
          lastValueRef.current[0] !== newValue[0] ||
          lastValueRef.current[1] !== newValue[1]
        ) {
          setModelValue(newValue as any)
          lastValueRef.current = newValue
        }
        return function () {
          isInit.current = false
        }
      },
      [redoxStore, batchManager]
    )

    useEffect(
      function () {
        const fn = function () {
          const newValue = getStateActions(
            model,
            redoxStore,
            selectorRef.current
          )
          if (lastValueRef.current[0] !== newValue[0]) {
            setModelValue(newValue as any)
            lastValueRef.current = newValue
          }
        }

        const unSubscribe = batchManager.addSubscribe(model, redoxStore, fn)

        return () => {
          unSubscribe()
        }
      },
      [redoxStore, batchManager]
    )

    // selector change, need updated once
    useEffect(
      function () {
        if (isInit.current) {
          batchManager.triggerSubscribe(model)
        }
      },
      [batchManager, selectorRef.current]
    )

    return modelValue
  }

export const createUseStaticModel =
  (
    redoxStore: RedoxStore,
    batchManager: ReturnType<typeof createBatchManager>
  ) =>
  <IModel extends AnyModel, S extends Selector<IModel>>(
    model: IModel,
    selector?: S,
    depends?: any[]
  ) => {
    const selectorRef = useRef<
      undefined | ((() => ReturnType<S>) & { clearCache: () => void })
    >(undefined)

    const cacheFn = useMemo(
      function () {
        if (!selector) {
          return (selectorRef.current = undefined)
        }
        selectorRef.current = redoxStore
          .getModel(model)
          .$createSelector(selector)
        return selectorRef.current
      },
      [redoxStore, batchManager, ...(depends ? depends : [selector])]
    )

    useEffect(
      function () {
        return function () {
          cacheFn?.clearCache()
        }
      },
      [cacheFn]
    )

    const initialValue = useMemo(() => {
      return getStateActions(model, redoxStore, selectorRef.current)
    }, [redoxStore, batchManager])

    const stateRef = useRef<any>(initialValue[0])

    const value = useRef<[any, any]>([stateRef, initialValue[1]])

    const isInit = useRef<boolean>(false)

    useEffect(() => {
      // useEffect is async, there's maybe some async update state before store subscribe
      // check state and actions once, need update if it changed
      isInit.current = true
      const newValue = getStateActions(model, redoxStore, selectorRef.current)
      if (
        stateRef.current !== newValue[0] ||
        value.current[1] !== newValue[1]
      ) {
        stateRef.current = newValue[0]
        value.current = [stateRef, newValue[1]]
      }
      return () => {
        isInit.current = false
      }
    }, [redoxStore, batchManager])

    useEffect(() => {
      const fn = () => {
        const newValue = getStateActions(model, redoxStore, selectorRef.current)
        if (stateRef.current !== newValue[0]) {
          stateRef.current = newValue[0]
        }
      }

      const unSubscribe = batchManager.addSubscribe(model, redoxStore, fn)

      return () => {
        unSubscribe()
      }
    }, [redoxStore, batchManager])

    // selector change, need updated once
    useEffect(
      function () {
        if (isInit.current) {
          batchManager.triggerSubscribe(model)
        }
      },
      [batchManager, selectorRef.current]
    )

    return value.current
  }
