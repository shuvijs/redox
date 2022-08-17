import {
  defineModel,
  redox as _redox,
  RedoxOptions,
  ModelPublicInstance,
  Action,
  Selector,
  SelectorParams,
  AnyModel,
  RedoxStore,
  Plugin,
} from './core'
import devTools from './devtools'

const redox = function (
  { initialState, plugins = [] }: RedoxOptions = {} as RedoxOptions
) {
  if (process.env.NODE_ENV === 'development') {
    plugins.unshift([devTools])
  }

  return _redox({
    initialState,
    plugins,
  })
}

export {
  defineModel,
  RedoxStore,
  redox,
  Plugin,
  ModelPublicInstance,
  RedoxOptions,
  AnyModel,
  Action,
  Selector,
  SelectorParams,
}

export * from './types'
