import createContainer from './createContainer'
import { useModel } from './useModel'

const {
	Provider: RedoxRoot,
	useSharedModel: useRootModel,
	useStaticModel: useRootStaticModel,
} = createContainer()

export { RedoxRoot, useRootModel, useRootStaticModel }

export { useModel, createContainer }

export { ISelectorParams } from './types'
