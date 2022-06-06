import { createContainer } from '@shuvi/redox-react'
import { redox } from '@shuvi/redox'

const modelManger = redox()

const {
	Provider: RedoxRoot,
	useSharedModel: useRootModel,
	useStaticModel: useRootStaticModel,
} = createContainer()

export { RedoxRoot, useRootModel, useRootStaticModel, modelManger }
