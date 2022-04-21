import { AnyModel } from './types'

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

export const validateModel = (model: AnyModel): void => {
	validate(() => [
		[!model, 'model config is required'],
		[
			typeof model.name !== 'string' || !model.name,
			'model "name[string]"  is required and can\'t be empty !',
		],
		[
			typeof model.state !== 'object',
			'model "state" is required and it should be object !',
		],
		[
			typeof model.reducers === 'undefined',
			'model "reducers" is required and it should be object !',
		],
	])
	const keys = new Set<string>()
	validateProperty(model, 'reducers', keys)
	validateProperty(model, 'effects', keys)
	validateProperty(model, 'views', keys)
	keys.clear()
}

function validateProperty(
	model: AnyModel,
	prop: keyof AnyModel,
	keys: Set<string>
) {
	const target = model[prop] as any
	if (target) {
		validate(() => [
			[typeof target !== 'object', `model.${prop} should be object !`],
		])
		for (const Key of Object.keys(target)) {
			if (keys.has(Key)) {
				keys.clear()
				validate(() => [[true, `repeat key "${Key}" in model.${prop} !`]])
				break
			} else {
				validate(() => [
					[
						typeof target[Key] !== 'function',
						`model.${prop} "${Key}" should be function !`,
					],
				])
				keys.add(Key)
			}
		}
	}
}

export default validate
