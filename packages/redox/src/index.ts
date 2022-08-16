import {
  defineModel,
  redox as internalRedox,
  RedoxOptions,
  ModelInstance,
  Action,
  Selector,
  SelectorParams,
  AnyModel,
} from './core'
import devTools from './devtools'
import { RedoxStore, Plugin } from './core/types'

const redox = function (
  { initialState, plugins = [] }: RedoxOptions = {} as RedoxOptions
) {
  if (process.env.NODE_ENV === 'development') {
    plugins.unshift([devTools])
  }
  return internalRedox({
    initialState,
    plugins,
  })
}

export {
  defineModel,
  RedoxStore,
  redox,
  Plugin,
  ModelInstance,
  RedoxOptions,
  AnyModel,
  Action,
  Selector,
  SelectorParams,
}

export * from './types'
