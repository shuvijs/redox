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
import { createUseModel } from './createUseModel'
import { getStateActions } from './getStateActions'
import { createBatchManager } from './batchManager'
import { shadowEqual } from './utils'
import { IUseModel, IUseStaticModel, ISelector } from './types'

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

		const [contextValue, setContextValue] = useState(memoContext) // for hmr keep contextValue

		useEffect(
			function () {
				setContextValue(memoContext)
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

	const useStaticModel: IUseStaticModel = <
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

		const stateRef = useRef<any>(initialValue[0])

		const value = useRef<[any, any]>([stateRef, initialValue[1]])

		useEffect(() => {
			const fn = () => {
				const newValue = getStateActions(model, modelManager, selector)
				if (!shadowEqual(stateRef.current, newValue[0])) {
					stateRef.current = newValue[0]
				}
			}

			const unSubscribe = batchManager.addSubscribe(model, modelManager, fn)

			// useEffect is async, there's maybe some async update state before store subscribe
			// check state and actions once, need update if it changed
			const newValue = getStateActions(model, modelManager, selector)
			if (
				// selector maybe return new object each time, compare value with shadowEqual
				!shadowEqual(stateRef.current, newValue[0]) ||
				value.current[1] !== newValue[1]
			) {
				stateRef.current = newValue[0]
				value.current = [stateRef, newValue[1]]
			}

			return () => {
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

const {
	Provider: RedoxRoot,
	useSharedModel: useRootModel,
	useStaticModel: useRootStaticModel,
} = createContainer()

export { RedoxRoot, useRootModel, useRootStaticModel }

export default createContainer
