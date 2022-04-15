import { State, Depends } from './types'

import { IModelManager } from './redoxStore'

export function getDependsState(depends: Depends = [], cache: IModelManager) {
	let state = {} as Record<string, State>
	if (depends) {
		for (const model of depends) {
			state[model.name] = cache._getRedox(model).getState()
		}
	}
	return state
}

export const emptyObject = Object.create(null)
