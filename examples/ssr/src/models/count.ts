import { defineModel } from '@shuvi/redox'
import { delay } from './utils'

export const count = defineModel({
	name: 'count',
	state: { value: 0 },
	reducers: {
		increment: (state, payload: number) => {
			return {
				value: state.value + payload
			}
		},
	},
	effects: {
		async incrementAsync() {
			await delay(2)
			this.increment(1)
		},
	}
})
