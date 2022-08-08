import { redox as internalRedox, RedoxOptions } from './core'
import validate from './validate'
import { defineModel } from './defineModel'
import devTools from './devtools'
import { IStoreManager, IPlugin } from './core/types'
import { storeApi as Store } from './types'

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
  validate,
  defineModel,
  IStoreManager,
  Store,
  redox,
  IPlugin,
  RedoxOptions,
}

export * from './types'
