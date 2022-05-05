import createContainer from './createContainer'
import { useModel } from './useModel'
const {
	Provider: RootProvider,
	useSharedModel: useRootModel,
	useStaticModel: useRootStaticModel,
} = createContainer()

export {
	RootProvider,
	useRootModel,
	useRootStaticModel,
	useModel,
	createContainer,
}

export { ISelectorParams } from './types'
