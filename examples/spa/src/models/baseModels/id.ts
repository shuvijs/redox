import { defineModel } from '@shuvi/redox'

export const id = defineModel({
	name: 'id',
	state: { id: 0 },
	reducers: {
		setId: (state, payload: number) => {
			state.id = payload
		},
	},
})
