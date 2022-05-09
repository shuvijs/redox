import { defineModel } from '@shuvi/redox'
import { ISelectorParams } from '../../src'

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
	effects: {
		async asyncAdd(n: number) {
			await sleep(200)
			this.add(n)
		},
	},
	views: {
		test(args: number) {
			return this.value + args
		},
	},
})

export type countSelectorParameters = ISelectorParams<typeof countModel>
