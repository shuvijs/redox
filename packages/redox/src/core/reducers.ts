import { Action, RedoxDispatcher, AnyModel, DispatchOfModel } from '../types'
import type { InternalModel } from '../internalModel'

const createReducer = <IModel extends AnyModel>(
  internalModelInstance: InternalModel<IModel>,
  actionName: string
): RedoxDispatcher<boolean> => {
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
  $actions: DispatchOfModel<IModel>,
  internalModelInstance: InternalModel<IModel>
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
