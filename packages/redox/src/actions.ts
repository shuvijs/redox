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
			const storeApi = redoxStore._cache.get(redoxStore.model)
			const dependsStoreApi = {} as any
			const depends = redoxStore.model._depends
			if (depends) {
				depends.forEach((depend) => {
					const dependApi = redoxStore._cache.get(depend)
					dependsStoreApi[depend.name] = dependApi
				})
			}
			const thisPoint = {
				...storeApi,
				$dep: dependsStoreApi,
			}
			Object.defineProperty(thisPoint, '$state', {
				get() {
					return redoxStore.$state()
				},
			})
			return action.call(thisPoint, ...args)
		}
	})
}
