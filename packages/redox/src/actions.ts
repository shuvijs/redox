import { AnyModel } from './types'
import type { RedoxStore } from './redoxStore'

export const createActions = <IModel extends AnyModel>(
	redoxStore: RedoxStore<IModel>
): void => {
	const actions = redoxStore.model.actions!
	// map actions names to dispatch actions
	const actionKeys = Object.keys(actions) as Array<keyof IModel['actions']>
	actionKeys.forEach((actionsName) => {
		// @ts-ignore
		redoxStore.$actions[actionsName as string] = function (...args: any[]) {
			const action = actions[actionsName]
			const store = redoxStore._cache._getRedox(redoxStore.model)
			return action.call(
				{
					...store.storeApi,
					$dep: store.storeDepends,
				},
				...args
			)
		}
	})
}
