import { redox as internalRedox, RedoxOptions } from './core'
import validate from './validate'
import { defineModel } from './define-model'
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

export { validate, defineModel, RedoxStore, redox, Plugin, RedoxOptions }

export * from './types'
