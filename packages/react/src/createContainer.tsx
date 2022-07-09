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
import type {
	IStoreManager,
	AnyModel,
	RedoxOptions,
	ISelector,
} from '@shuvi/redox'
import { createUseModel } from './createUseModel'
import { getStateActions } from './getStateActions'
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
		const selectorFn = useRef<
			undefined | ((() => ReturnType<Selector>) & { clearCache: () => void })
		>(undefined)

		const cacheFn = useMemo(
			function () {
				if (!selector) {
					return undefined
				}
				selectorFn.current = storeManager.get(model).$createSelector(selector)
				return selectorFn.current
			},
			[storeManager, batchManager, ...(depends ? depends : [selector])]
		)

		useEffect(
			function () {
				return function () {
					cacheFn?.clearCache()
				}
			},
			[cacheFn]
		)

		const initialValue = useMemo(() => {
			return getStateActions(model, storeManager, selectorFn.current)
		}, [storeManager, batchManager])

		const stateRef = useRef<any>(initialValue[0])

		const value = useRef<[any, any]>([stateRef, initialValue[1]])

		useEffect(() => {
			// useEffect is async, there's maybe some async update state before store subscribe
			// check state and actions once, need update if it changed
			const newValue = getStateActions(model, storeManager, selectorFn.current)
			if (
				stateRef.current !== newValue[0] ||
				value.current[1] !== newValue[1]
			) {
				stateRef.current = newValue[0]
				value.current = [stateRef, newValue[1]]
			}
		}, [storeManager, batchManager, ...(depends || [])])

		useEffect(() => {
			const fn = () => {
				const newValue = getStateActions(
					model,
					storeManager,
					selectorFn.current
				)
				if (stateRef.current !== newValue[0]) {
					stateRef.current = newValue[0]
				}
			}

			const unSubscribe = batchManager.addSubscribe(model, storeManager, fn)

			return () => {
				unSubscribe()
			}
		}, [storeManager, batchManager])

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
