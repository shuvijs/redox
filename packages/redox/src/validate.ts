import { AnyModel } from './types'

/**
 * If the first item is true, it means there is an error described by
 * the second item.
 */
export type Validation = [boolean | undefined, string]

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

export const validateModel = (model: AnyModel): void => {
  validate(() => [[!model, 'model config is required']])
  validate(() => [[!model.hasOwnProperty('state'), 'state is required']])
  validate(() => [
    [
      typeof model.state === 'bigint' || typeof model.state === 'symbol',
      'state can not be BigInt or Symbol',
    ],
  ])
  const keys = new Set<string>(Object.keys(model.state || {}))
  validateProperty(model, 'views', keys, 'check state and views')
  keys.clear()
  validateProperty(model, 'reducers', keys, 'check reducers')
  validateProperty(model, 'actions', keys, 'check reducers and actions')
  validateProperty(model, 'views', keys, 'check reducers, actions and views')
  keys.clear()
}

function validateProperty(
  model: AnyModel,
  prop: keyof AnyModel,
  keys: Set<string>,
  extraTip: string = ''
) {
  const target = model[prop] as any
  if (target) {
    validate(() => [
      [typeof target !== 'object', `model.${prop} should be object !`],
    ])
    for (const Key of Object.keys(target)) {
      if (keys.has(Key)) {
        keys.clear()
        validate(() => [
          [true, `${extraTip + ','}repeat key "${Key}" in model.${prop} !`],
        ])
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
