import { unstable_batchedUpdates } from 'react-dom'
import type { AnyModel, IModelManager } from '@shuvi/redox'

const createBatchManager = () => {
	// Models are in using now
	const usingModelsMap = new Map<AnyModel, Set<() => void>>()
	const modelManagerUnSub = new Map<AnyModel, () => void>()

	// add models to listen
	const addSubscribe = function (
		model: AnyModel,
		modelManager: IModelManager,
		fn: () => void
	) {
		let modelsFnSet = usingModelsMap.get(model)
		if (!modelsFnSet) {
			modelsFnSet = new Set()
			modelsFnSet.add(fn)
			const unSubscribe = modelManager.subscribe(model, function () {
				triggerSubscribe(model) // render self;
			})
			usingModelsMap.set(model, modelsFnSet)
			modelManagerUnSub.set(model, unSubscribe)
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
		if (modelsFnSet) {
			modelsFnSet.delete(fn)
		}
		if (modelsFnSet?.size === 0 && modelManagerUnSub.has(model)) {
			usingModelsMap.delete(model)
			const UnSubFn = modelManagerUnSub.get(model)
			UnSubFn!()
			modelManagerUnSub.delete(model)
		}
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

	return {
		addSubscribe,
	}
}

export { createBatchManager }
