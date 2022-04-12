import {
	Effects,
	Reducers,
	AnyModel,
} from './types'

/**
 * If the first item is true, it means there is an error described by
 * the second item.
 */
export type Validation = [boolean | undefined, string]

/**
 * Checks if a parameter is a valid object.
 */
export const isObject = <T>(obj: T): boolean =>
	typeof obj === 'object' && obj !== null && !Array.isArray(obj)

/**
 * Checks if a parameter is a valid function but only when it's defined.
 * Otherwise, always returns true.
 */
export const ifDefinedIsFunction = <T>(func: T): boolean =>
	!func || typeof func === 'function'

/**
 * Takes an array of arrays of validations. Collects all errors and throws.
 * Should be used by plugins to keep the validation behaviour the same for all
 * Redox-related libraries.
 */
const validate = (runValidations: () => Validation[]): void => {
	if (process.env.NODE_ENV !== 'production') {
		const validations = runValidations()
		const errors: string[] = []

		validations.forEach((validation) => {
			const isInvalid = validation[0]
			const errorMessage = validation[1]
			if (isInvalid) {
				errors.push(errorMessage)
			}
		})

		if (errors.length > 0) {
			throw new Error(errors.join(', '))
		}
	}
}

export const validateModel = (
	model: AnyModel
): void => {
	validate(() => [
		[!model, 'model config is required'],
		[typeof model.name !== 'string', 'model "name[string]"  is required !'],
		[
			typeof model.state !== 'object',
			'model "state" is required and it should be object !'
		],
		[
			model.reducers === undefined,
			'model "reducers" is required and it should be object !',
		],
	])
}

export const validateModelReducer = (
	modelName: string,
	reducers: Reducers<any>,
	reducerName: string
): void => {
	validate(() => [
		[
			!!reducerName.match(/\/.+\//),
			`Invalid reducer name (${modelName}/${reducerName})`,
		],
		[
			typeof reducers[reducerName] !== 'function',
			`Invalid reducer (${modelName}/${reducerName}). Must be a function`,
		],
	])
}

export const validateModelEffect = (
	modelName: string,
	effects: Effects<any, any, any>,
	effectName: string
): void => {
	validate(() => [
		[
			typeof effects[effectName] !== 'function',
			`Invalid effect (${modelName}/${effectName}). Must be a function`,
		],
	])
}

export default validate
