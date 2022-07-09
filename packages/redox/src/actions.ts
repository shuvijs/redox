import { AnyModel, Store } from './types'
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
					const dependStore = redoxStore._cache._getRedox(depend)
					const { $createView, $actions, ...dependApiRest } = dependApi
					const res = {
						...(dependApiRest as Omit<
							Store<Readonly<IModel>>,
							'$createView' | '$actions'
						>),
					}
					Object.defineProperty(res, '$state', {
						enumerable: true,
						get() {
							return dependStore.$state()
						},
					})
					const views = dependStore.$views
					Object.keys(views).forEach((viewKey) => {
						Object.defineProperty(res, viewKey, {
							enumerable: true,
							get() {
								return views[viewKey].call()
							},
						})
					})
					dependsStoreApi[depend.name] = res
				})
			}
			const { $createView, $actions, ...storeApiRest } = storeApi
			const thisPoint = {
				...storeApiRest,
				$dep: dependsStoreApi,
			}
			Object.defineProperty(thisPoint, '$state', {
				get() {
					return redoxStore.$state()
				},
			})
			const views = redoxStore.$views
			Object.keys(views).forEach((viewKey) => {
				Object.defineProperty(thisPoint, viewKey, {
					enumerable: true,
					get() {
						return views[viewKey].call()
					},
				})
			})
			return action.call(thisPoint, ...args)
		}
	})
}
