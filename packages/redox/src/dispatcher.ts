import {
	Action,
	RedoxDispatcher,
	Reducers,
	Store,
	AnyModel,
} from './types'
import { validateModelEffect, validateModelReducer } from './validate'

/**
 * Builds a dispatcher for given model name and action name. The dispatched
 * action will have a type `modelName/actionName`.
 * Additionally, adds the isEffect property to the created dispatcher.
 * isEffect helps to differentiate effects dispatchers from reducer dispatchers.
 */
const createActionDispatcher = <
	IModel extends AnyModel
>(
	store: Store<IModel>,
	actionName: string,
	isEffect: boolean
): RedoxDispatcher<boolean> => {
	return Object.assign(
		(payload?: any): Action => {
			const action: Action = { type: actionName }

			if (typeof payload !== 'undefined') {
				action.payload = payload
			}
			return store.dispatch(action)
		},
		{
			isEffect,
		}
	)
}

/**
 * Creates a dispatcher object for a model - it contains a mapping from all
 * reducers to functions which dispatch their corresponding actions.
 */
export const createReducerDispatcher = <
	IModel extends AnyModel
>(
	store: Store<IModel>,
	model: IModel
): void => {
	const dispatch = store.dispatch as Reducers<any>
	// map reducer names to dispatch actions
	const reducersKeys = Object.keys(model.reducers)
	reducersKeys.forEach((reducerName) => {
		validateModelReducer(model.name, model.reducers, reducerName)
		dispatch[reducerName] = createActionDispatcher(
			store,
			reducerName,
			false
		)
	})
}

/**
 * Creates effects dispatcher for a model - it contains a mapping from all
 * effects *names* to functions which dispatch their corresponding actions.
 */
export const createEffectDispatcher = <
	IModel extends AnyModel
>(
	store: Store<IModel>,
	model: IModel
): void => {
	const dispatch = store.dispatch as Reducers<any>

	const effects = model.effects

	if (effects) {
		// map effects names to dispatch actions
		const effectKeys = Object.keys(effects) as Array<keyof IModel['effects']>
		effectKeys.forEach((effectName) => {
			validateModelEffect(model.name, effects, effectName as string)
			dispatch[effectName as string] = createActionDispatcher(
				store,
				effectName as string,
				true
			)
		})
	}
}
