import { unstable_batchedUpdates } from 'react-dom'
import type { AnyModel } from '@shuvi/redox'

const createBatchManager = () => {
	// Models are in using now
	const usingModelsMap = new Map<AnyModel, Set<() => void>>()

	// add models to listen
	const addSubscribe = function (model: AnyModel, fn: () => void) {
		let modelsFnSet = usingModelsMap.get(model)
		if (!modelsFnSet) {
			modelsFnSet = new Set()
			modelsFnSet.add(fn)
			usingModelsMap.set(model, modelsFnSet)
		} else {
			modelsFnSet.add(fn)
		}
		return function () {
			return removeSubscribe(model, fn)
		}
	}

	// remove models to listen
	const removeSubscribe = function (model: AnyModel, fn: () => void) {
		let modelsFnSet = usingModelsMap.get(model)
		if (!modelsFnSet) {
			return
		}
		modelsFnSet.clear()
		modelsFnSet.delete(fn)
	}

	// listen to models in using
	const triggerSubscribe = function (model: AnyModel) {
		const updateList: (() => void)[] = Array.from(
			usingModelsMap.get(model) || []
		)

		unstable_batchedUpdates(() => {
			let update: (() => void) | undefined = updateList.pop()

			while (update) {
				update()

				update = updateList.pop()
			}
		})
	}

	const hasInitModel = function (model: AnyModel) {
		return !!usingModelsMap.get(model)
	}

	const initModel = function (model: AnyModel) {
		usingModelsMap.set(model, new Set())
	}

	const destroy = function () {
		for (const modelSet of usingModelsMap.values()) {
			modelSet.clear()
		}
		usingModelsMap.clear()
	}

	return {
		addSubscribe,
		removeSubscribe,
		triggerSubscribe,
		hasInitModel,
		initModel,
		destroy,
	}
}

export { createBatchManager }
