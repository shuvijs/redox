import { AnyModel } from './defineModel'
import { Action, Actions } from './modelOptions'
import type { Model } from './model'

const createReducer = <IModel extends AnyModel>(
  internalModelInstance: Model<IModel>,
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
export const createReducers = <IModel extends AnyModel>(
  $actions: Actions<IModel>,
  internalModelInstance: Model<IModel>
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
