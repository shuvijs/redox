import { defineModel } from '@shuvi/redox'
import { delay } from './utils'

export const count = defineModel({
	name: 'count',
	state: { value: 0 },
	reducers: {
		increment: (state, payload: number) => {
			state.value += payload // change state by immer way
		},
	},
	effects: {
		async incrementAsync() {
			await delay(2)
			this.increment(1)
		},
	},
})
