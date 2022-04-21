import React, {
	createContext,
	useContext,
	PropsWithChildren,
	useEffect,
	useMemo,
	useRef,
} from 'react'
import { validate, redox } from '@shuvi/redox'
import type { IModelManager, AnyModel } from '@shuvi/redox'
import { createUseModel, initModel, getStateActions } from './useModel'
import { createBatchManager } from './batchManager'
import { IUseModel, ISelector } from './types'

const createContainer = () => {
	const Context = createContext<{
		modelManager: IModelManager
		batchManager: ReturnType<typeof createBatchManager>
	}>(null as any)

	const Provider = (
		props: PropsWithChildren<{ modelManager?: IModelManager }>
	) => {
		const { children, modelManager: propsModelManager } = props

		let modelManager: IModelManager
		if (propsModelManager) {
			modelManager = propsModelManager
		} else {
			modelManager = redox()
		}
		const batchManager = createBatchManager()

		useEffect(() => {
			return function () {
				batchManager.destroy()
			}
		}, [])

		return (
			<Context.Provider value={{ modelManager, batchManager }}>
				{children}
			</Context.Provider>
		)
	}

	const useSharedModel: IUseModel = <
		IModel extends AnyModel,
		Selector extends ISelector<IModel>
	>(
		model: IModel,
		selector?: Selector
	) => {
		const context = useContext(Context)

		validate(() => [
			[!Boolean(model), `useModel param model is necessary`],
			[
				!Boolean(context),
				`You should wrap your Component in CreateApp().Provider.`,
			],
		])

		const { modelManager, batchManager } = context

		return useMemo(
			() => createUseModel(modelManager, batchManager),
			[modelManager, batchManager]
		)(model, selector)
	}

	const useStaticModel: IUseModel = <
		IModel extends AnyModel,
		Selector extends ISelector<IModel>
	>(
		model: IModel,
		selector?: Selector
	) => {
		const context = useContext(Context)

		validate(() => [
			[
				!Boolean(context),
				'You should wrap your Component in CreateApp().Provider.',
			],
		])

		const { modelManager, batchManager } = context
		const initialValue = useMemo(() => {
			initModel(model, modelManager, batchManager)
			return getStateActions(model, modelManager, selector)
		}, [])

		const value = useRef<[any, any]>([
			// deep clone state in case mutate origin state accidentlly.
			JSON.parse(JSON.stringify(initialValue[0])),
			initialValue[1],
		])

		useEffect(() => {
			const fn = () => {
				const newValue = getStateActions(model, modelManager, selector)
				if (
					Object.prototype.toString.call(value.current[0]) === '[object Object]'
				) {
					// merge data to old reference
					Object.assign(value.current[0], newValue[0])
					Object.assign(value.current[1], newValue[1])
				}
			}
			const unSubscribe = batchManager.addSubscribe(model, fn)

			return () => {
				unSubscribe()
			}
		}, [])

		return value.current
	}

	return {
		Provider,
		useSharedModel,
		useStaticModel,
	}
}

export default createContainer
