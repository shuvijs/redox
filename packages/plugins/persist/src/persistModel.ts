import { defineModel } from '@shuvi/redox'

export const persistModel = defineModel({
	name: '_persist',
	state: {
		rehydrated: false,
		version: -1,
	},
	reducers: {
		setRehydrated(state, rehydrated: boolean = true) {
			state.rehydrated = rehydrated
		},
		setVersion(state, version: number) {
			state.version = version
		},
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
