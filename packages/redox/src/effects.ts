import { AnyModel } from './types'
import type { RedoxStore } from './redoxStore'

export const createEffects = <IModel extends AnyModel>(
	redoxStore: RedoxStore<IModel>
): void => {
	const effects = redoxStore.model.effects!
	// map effects names to dispatch actions
	const effectKeys = Object.keys(effects) as Array<keyof IModel['effects']>
	effectKeys.forEach((effectName) => {
		// @ts-ignore
		redoxStore.$actions[effectName as string] = function (...args: any[]) {
			const effect = effects[effectName]
			const store = redoxStore._cache._getRedox(redoxStore.model)
			return effect.call(
				{
					...store.storeApi,
					$dep: store.storeDepends,
				},
				...args
			)
		}
	})
}
