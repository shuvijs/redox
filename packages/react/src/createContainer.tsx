import React, {
	createContext,
	useContext,
	PropsWithChildren,
	useEffect,
	useMemo,
	useState,
	useRef,
} from 'react'
import { validate, redox } from '@shuvi/redox'
import type { IModelManager, AnyModel, RedoxOptions } from '@shuvi/redox'
import { createUseModel, getStateActions } from './useModel'
import { createBatchManager } from './batchManager'
import { IUseModel, ISelector } from './types'

const createContainer = function (options?: RedoxOptions) {
	const Context = createContext<{
		modelManager: IModelManager
		batchManager: ReturnType<typeof createBatchManager>
	}>(null as any)
	function Provider(
		props: PropsWithChildren<{ modelManager?: IModelManager }>
	) {
		const { children, modelManager: propsModelManager } = props

		const memoContext = useMemo(
			function () {
				let modelManager: IModelManager
				if (propsModelManager) {
					modelManager = propsModelManager
				} else {
					modelManager = redox(options)
				}
				const batchManager = createBatchManager()

				return {
					modelManager,
					batchManager,
				}
			},
			[propsModelManager]
		)

		const [contextValue, setContextValue] = useState(memoContext)

		const modelManagerPos = useRef(propsModelManager) // for hmr

		useEffect(
			function () {
				if (modelManagerPos.current !== propsModelManager) {
					modelManagerPos.current = propsModelManager
					setContextValue(memoContext)
				}
			},
			[propsModelManager]
		)

		return <Context.Provider value={contextValue}>{children}</Context.Provider>
	}

	const useSharedModel: IUseModel = <
		IModel extends AnyModel,
		Selector extends ISelector<IModel>
	>(
		model: IModel,
		selector?: Selector
	) => {
		const context = useContext(Context)
		if (process.env.NODE_ENV === 'development') {
			validate(() => [
				[!Boolean(model), `useModel param model is necessary`],
				[!model.name, 'model "name" is required and can\'t be empty !'],
				[typeof model.name !== 'string', 'model "name" must be string !'],
				[
					!Boolean(context),
					`You should wrap your Component in createContainer().Provider.`,
				],
			])
		}

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
		if (process.env.NODE_ENV === 'development') {
			validate(() => [
				[!Boolean(model), `useModel param model is necessary`],
				[!model.name, 'model "name" is required and can\'t be empty !'],
				[typeof model.name !== 'string', 'model "name" must be string !'],
				[
					!Boolean(context),
					'You should wrap your Component in createContainer().Provider.',
				],
			])
		}

		const { modelManager, batchManager } = context
		const initialValue = useMemo(() => {
			return getStateActions(model, modelManager, selector)
		}, [modelManager, batchManager])

		const value = useRef<[any, any]>([
			// deep clone state in case mutate origin state accidentlly.
			JSON.parse(JSON.stringify(initialValue[0])),
			initialValue[1],
		])

		const isUpdate = useRef(false)

		useEffect(() => {
			const fn = () => {
				const newValue = getStateActions(model, modelManager, selector)
				if (
					Object.prototype.toString.call(value.current[0]) === '[object Object]'
				) {
					// merge data to old reference
					Object.assign(value.current[0], newValue[0])
				}
			}
			if (isUpdate.current) {
				value.current = [
					JSON.parse(JSON.stringify(initialValue[0])),
					initialValue[1],
				]
			} else {
				isUpdate.current = true
			}
			// useEffect is async ,there's maybe some async update state between init and useEffect, trigger fn once
			fn()

			const unSubscribe = batchManager.addSubscribe(model, modelManager, fn)
			return () => {
				isUpdate.current = false
				unSubscribe()
			}
		}, [modelManager, batchManager])

		return value.current
	}

	return {
		Provider,
		useSharedModel,
		useStaticModel,
	}
}

export default createContainer
