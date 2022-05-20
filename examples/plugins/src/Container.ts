import { createContainer } from '@shuvi/redox-react'

const {
	Provider: RedoxRoot,
	useSharedModel: useRootModel,
	useStaticModel: useRootStaticModel,
} = createContainer()

export { RedoxRoot, useRootModel, useRootStaticModel }
