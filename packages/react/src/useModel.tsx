import { useMemo, useRef } from 'react'
import { redox, validate } from '@shuvi/redox'
import type { AnyModel } from '@shuvi/redox'
import { createBatchManager } from './batchManager'
import { createUseModel } from './createUseModel'
import { IUseModel, ISelector } from './types'

const useModel: IUseModel = <
	IModel extends AnyModel,
	Selector extends ISelector<IModel>
>(
	model: IModel,
	selector?: Selector
) => {
	if (process.env.NODE_ENV === 'development') {
		validate(() => [[!Boolean(model), `useModel param model is necessary`]])
	}

	let [modelManager, batchManager] = useMemo(function () {
		return [redox(), createBatchManager()]
	}, [])

	const contextValue = useRef({
		modelManager,
		batchManager,
	})

	return useMemo(
		function () {
			return createUseModel(
				contextValue.current.modelManager,
				contextValue.current.batchManager
			)
		},
		[contextValue.current.modelManager, contextValue.current.batchManager]
	)(model, selector)
}

export { useModel }
