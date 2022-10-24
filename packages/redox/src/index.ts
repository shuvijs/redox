import {
  defineModel,
  redox as _redox,
  RedoxOptions,
  ModelPublicInstance,
  Action,
  Selector,
  ModelSnapshot,
  ModelView,
  AnyModel,
  RedoxStore,
  Plugin,
  nextTick,
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
  ModelSnapshot,
  ModelView,
  nextTick,
}

export * from './types'
export * from './utils'
