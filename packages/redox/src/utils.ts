import {
	State,
	Store,
	Depends,
} from './types'

import { IModelManager } from './redoxStore'

export function getDependsState(depends: Depends = [], cache: IModelManager) {
	let state = {} as Record<string, State>
	if(depends){
		for (const model of depends) {
			state[model.name] = cache.get(model).getState()
		}
	}
	return state
}

export function getDependsDispatch(depends: Depends = [], cache: IModelManager) {
	let dispatch = {} as Record<string, Store<any>['dispatch']>
	if(depends){
		for (const model of depends) {
			dispatch[model.name] = cache.get(model).dispatch as Store<any>['dispatch']
		}
	}
	return dispatch
}

export const emptyObject = Object.create(null);