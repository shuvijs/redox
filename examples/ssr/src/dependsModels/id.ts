import { defineModel } from '@shuvi/redox'
import { delay } from '../models/utils'

export const id = defineModel({
	name: 'id',
	state: { id: 0 },
	reducers: {
		increment: (state, payload: number) => {
			return {
				id: payload
			}
		},
	},
	effects: {
		async incrementAsync(id?: number) {
			await delay(500)
			this.increment(id || 1)
		},
	}
})
