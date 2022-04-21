import { defineModel } from '@shuvi/redox'

export const login = defineModel({
	name: 'login',
	state: { isLogin: false },
	reducers: {
		toggleLogin: (state) => {
			state.isLogin = !state.isLogin // change state by immer way
		},
	},
})
