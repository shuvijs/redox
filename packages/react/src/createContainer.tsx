import React, {
	createContext,
	useContext,
	PropsWithChildren,
	useEffect,
	useMemo,
	useState,
} from 'react'
import { validate, redox } from '@shuvi/redox'
import type {
	IStoreManager,
	AnyModel,
	RedoxOptions,
	ISelector,
} from '@shuvi/redox'
import { createUseModel, createUseStaticModel } from './createUseModel'
import { createBatchManager } from './batchManager'
import { IUseModel, IUseStaticModel } from './types'

const createContainer = function (options?: RedoxOptions) {
	const Context = createContext<{
		storeManager: IStoreManager
		batchManager: ReturnType<typeof createBatchManager>
	}>(null as any)
	function Provider(
		props: PropsWithChildren<{ storeManager?: IStoreManager }>
	) {
		const { children, storeManager: propsStoreManager } = props

		const memoContext = useMemo(
			function () {
				let storeManager: IStoreManager
				if (propsStoreManager) {
					storeManager = propsStoreManager
				} else {
					storeManager = redox(options)
				}
				const batchManager = createBatchManager()

				return {
					storeManager,
					batchManager,
				}
			},
			[propsStoreManager]
		)

		const [contextValue, setContextValue] = useState(memoContext) // for hmr keep contextValue

		useEffect(
			function () {
				setContextValue(memoContext)
			},
			[propsStoreManager]
		)

		return <Context.Provider value={contextValue}>{children}</Context.Provider>
	}

	const useSharedModel: IUseModel = <
		IModel extends AnyModel,
		Selector extends ISelector<IModel>
	>(
		model: IModel,
		selector?: Selector,
		depends?: any[]
	) => {
		const context = useContext(Context)
		if (process.env.NODE_ENV === 'development') {
			validate(() => [
				[!Boolean(model), `useModel param model is necessary`],
				[!model.name, 'model "name" is required and can\'t be empty !'],
				[
					model._depends?.some((model) => !model.name),
					'depends model, "name" is required and can\'t be empty !',
				],
				[typeof model.name !== 'string', 'model "name" must be string !'],
				[
					!Boolean(context),
					`You should wrap your Component in createContainer().Provider.`,
				],
			])
		}

		const { storeManager, batchManager } = context

		return useMemo(
			() => createUseModel(storeManager, batchManager),
			[storeManager, batchManager]
		)(model, selector, depends)
	}

	const useStaticModel: IUseStaticModel = <
		IModel extends AnyModel,
		Selector extends ISelector<IModel>
	>(
		model: IModel,
		selector?: Selector,
		depends?: any[]
	) => {
		const context = useContext(Context)
		if (process.env.NODE_ENV === 'development') {
			validate(() => [
				[!Boolean(model), `useModel param model is necessary`],
				[!model.name, 'model "name" is required and can\'t be empty !'],
				[
					model._depends?.some((model) => !model.name),
					'depends model, "name" is required and can\'t be empty !',
				],
				[typeof model.name !== 'string', 'model "name" must be string !'],
				[
					!Boolean(context),
					'You should wrap your Component in createContainer().Provider.',
				],
			])
		}

		const { storeManager, batchManager } = context

		return useMemo(
			() => createUseStaticModel(storeManager, batchManager),
			[storeManager, batchManager]
		)(model, selector, depends)
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
