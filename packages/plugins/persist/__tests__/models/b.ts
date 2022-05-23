import { defineModel } from '@shuvi/redox'
import { delay } from '../utils/delay'

export const b = defineModel({
	name: 'b',
	state: { b: 0 },
	reducers: {
		add: (state, payload: number = 1) => {
			state.b += payload
		},
	},
	actions: {
		async addAsync() {
			await delay(2)
			this.add(1)
		},
	},
})
