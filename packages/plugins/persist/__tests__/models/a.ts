import { defineModel } from '@shuvi/redox'
import { delay } from '../utils/delay'

export const a = defineModel({
	name: 'a',
	state: { a: 0 },
	reducers: {
		add: (state, payload: number = 1) => {
			state.a += payload
		},
	},
	actions: {
		async addAsync() {
			await delay(2)
			this.add(1)
		},
	},
})
