import { defineModel } from '@shuvi/redox'
import { test } from './test'

export const local = defineModel({
	name: 'local',
	state: { value: 'localValue' },
	reducers: {
		setLocal: (_state, payload: string) => {
			return {
				value: payload
			}
		},
	},
}, [test])
