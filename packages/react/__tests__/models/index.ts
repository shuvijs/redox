import { defineModel } from '@shuvi/redox'
import { IModelSelector } from '../../src'

export const sleep = (time: number) =>
	new Promise((resolve) => {
		setTimeout(() => {
			resolve(null)
		}, time)
	})

export const countModel = defineModel({
	name: 'countModel',
	state: {
		value: 1,
	},
	reducers: {
		add(state, payload: number = 1) {
			state.value += payload
		},
	},
	actions: {
		async asyncAdd(n: number) {
			await sleep(200)
			this.add(n)
		},
	},
	views: {
		test() {
			return this.value + 1
		},
	},
})

export type countSelector = IModelSelector<typeof countModel>
