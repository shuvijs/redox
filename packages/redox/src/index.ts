import {
	internalRedox,
	IStoreManager,
	RedoxStore,
	IPlugin,
	RedoxOptions,
} from './redoxStore'
import validate from './validate'
import { defineModel } from './defineModel'

function redox(options?: RedoxOptions): IStoreManager {
	const { _getRedox, ...rest } = internalRedox(options)
	return {
		...rest,
	}
}

export {
	validate,
	defineModel,
	IStoreManager,
	redox,
	RedoxStore,
	IPlugin,
	RedoxOptions,
}

export * from './types'
