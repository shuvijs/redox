import { DeepReadonly } from './types'

export const emptyObject = Object.create(null)

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
