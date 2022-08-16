import { DeepReadonly } from './types'

export const NOOP = () => {}

export const emptyObject = Object.create(null)

export const extend = Object.assign

const hasOwnProperty = Object.prototype.hasOwnProperty
export const hasOwn = (
  val: object,
  key: string | symbol
): key is keyof typeof val => hasOwnProperty.call(val, key)

export const objectToString = Object.prototype.toString
export const toTypeString = (value: unknown): string =>
  objectToString.call(value)

export const isArray = Array.isArray
export const isMap = (val: unknown): val is Map<any, any> =>
  toTypeString(val) === '[object Map]'

export const isFunction = (val: unknown): val is Function =>
  typeof val === 'function'
export const isString = (val: unknown): val is string => typeof val === 'string'
export const isSymbol = (val: unknown): val is symbol => typeof val === 'symbol'
export const isObject = (val: unknown): val is Record<any, any> =>
  val !== null && typeof val === 'object'

export const toRawType = (value: unknown): string => {
  // extract "RawType" from strings like "[object RawType]"
  return toTypeString(value).slice(8, -1)
}

export const isPlainObject = (val: unknown): val is object =>
  toTypeString(val) === '[object Object]'

export const isIntegerKey = (key: unknown) =>
  isString(key) &&
  key !== 'NaN' &&
  key[0] !== '-' &&
  '' + parseInt(key, 10) === key

// compare whether a value has changed, accounting for NaN.
export const hasChanged = (value: any, oldValue: any): boolean =>
  !Object.is(value, oldValue)

const cacheStringFunction = <T extends (str: string) => string>(fn: T): T => {
  const cache: Record<string, string> = Object.create(null)
  return ((str: string) => {
    const hit = cache[str]
    return hit || (cache[str] = fn(str))
  }) as any
}

/**
 * @private
 */
export const capitalize = cacheStringFunction(
  (str: string) => str.charAt(0).toUpperCase() + str.slice(1)
)

export const def = (obj: object, key: string | symbol, value: any) => {
  Object.defineProperty(obj, key, {
    configurable: true,
    enumerable: false,
    value,
  })
}

/**
 * deeply copy object or arrays with nested attributes
 * @param  {any} obj
 * @return {any}     a depply copied replica of arguement passed
 */
const deepClone = (obj: any) => {
  if (!obj || typeof obj !== 'object') {
    return obj
  }
  let newObj = {}
  if (Array.isArray(obj)) {
    newObj = obj.map((item) => deepClone(item))
  } else {
    Object.keys(obj).forEach((key) => {
      return ((newObj as Record<string, any>)[key] = deepClone(obj[key]))
    })
  }
  return newObj
}

const deepFreeze = (obj: any) => {
  if (typeof obj !== 'object' || obj === null) return
  Object.freeze(obj)
  const propNames = Object.getOwnPropertyNames(obj)
  for (const name of propNames) {
    const value = obj[name]
    deepFreeze(value)
  }
  return obj
}

export const readonlyDeepClone = <T extends any>(obj: T): DeepReadonly<T> => {
  const res = deepClone(obj)
  deepFreeze(res)
  return res
}

export function patchObj(
  obj: Record<string, any>,
  partObj: Record<string, any>
) {
  Object.keys(partObj as Record<string, any>).forEach(function (key) {
    if (obj.hasOwnProperty(key) && isObject(partObj[key])) {
      patchObj(obj[key], partObj[key])
    } else {
      ;(obj as Record<string, any>)[key] = partObj[key]
    }
  })
}
