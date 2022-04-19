import createContainer, { useModel } from './createContainer'

const {
	Provider,
	useSharedModel: useGlobalModel,
	useStaticModel,
} = createContainer()

export { Provider, useGlobalModel, createContainer, useStaticModel, useModel }

export { ISelector } from './types'
