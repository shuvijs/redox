import createContainer from './createContainer'
import { useModel } from './useModel'
const {
	Provider,
	useSharedModel: useGlobalModel,
	useStaticModel,
} = createContainer()

export { Provider, useGlobalModel, createContainer, useStaticModel, useModel }

export { ISelectorParams } from './types'
