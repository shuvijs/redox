import validate, { validateModel } from './validate'
import {
	Effects,
	Model,
	MakeDeps,
	Reducers,
	Views,
	State,
	Tuple,
} from './types'

const modelNameCache = new Set<string>()

export const defineModel = <
	N extends string,
	S extends State,
	R extends Reducers<S>,
	E extends Effects<S, R, MC>,
	MC extends MakeDeps<D>,
	V extends Views<S, MC>,
	D extends any[] = []
>(
	modelOptions: Omit<Model<N, S, MC, R, E, V>, 'depends'>,
	depends?: Tuple<D>
) => {
	validateModel(modelOptions)
	const modelName = modelOptions.name
	validate(() => [
		[
			depends && !Array.isArray(depends),
			`second argument depends should be an array, now is ${typeof depends} !`,
		],
	])
	modelNameCache.add(modelName)
	const finalModel = modelOptions as Model<N, S, MC, R, E, V>
	finalModel._depends = depends
	return finalModel
}
