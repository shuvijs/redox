import { defineModel } from '@shuvi/redox'

export const persistModel = defineModel({
	name: '_persist',
	state: {
		rehydrated: false,
		version: -1,
	},
	actions: {
		purge(): Promise<any> {
			return Promise.resolve()
		},
		flush(): Promise<any> {
			return Promise.resolve()
		},
		togglePause() {},
	},
})
