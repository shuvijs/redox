import { defineModel } from '@shuvi/redox'
import { delay } from './utils'

export const count = defineModel({
	name: 'count',
	state: { value: 0 },
	reducers: {
		add: (state, payload: number) => {
			state.value += payload // change state by immer way
		},
	},
	effects: {
		async addAsync() {
			await delay(2)
			this.add(1)
		},
	},
})
