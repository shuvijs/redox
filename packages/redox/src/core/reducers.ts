import { AnyModel } from './defineModel'
import { Action, Actions } from './model'
import type { InternalModel } from '../internalModel'

const createReducer = <Model extends AnyModel>(
  internalModelInstance: InternalModel<Model>,
  actionName: string
): Function => {
  return (payload?: any): Action => {
    const action: Action = { type: actionName }

    if (typeof payload !== 'undefined') {
      action.payload = payload
    }
    return internalModelInstance.dispatch(action)
  }
}

/**
 * Creates a dispatcher object for a model - it contains a mapping from all
 * reducers to functions which dispatch their corresponding actions.
 */
export const createReducers = <Model extends AnyModel>(
  $actions: Actions<Model>,
  internalModelInstance: InternalModel<Model>
): void => {
  // map reducer names to dispatch actions
  const reducers = internalModelInstance.model.reducers

  if (!reducers) {
    return
  }

  const reducersKeys = Object.keys(reducers)
  reducersKeys.forEach((reducerName) => {
    // @ts-ignore
    $actions[reducerName] = createReducer(internalModelInstance, reducerName)
  })
}
