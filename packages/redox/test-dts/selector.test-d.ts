import { defineModel, ISelectorParams } from './'

type customType = 'custom' | 'custom0'

const count = defineModel({
	name: 'count',
	state: {
		value: 1,
		s: '',
	},
	reducers: {
		addValue(state, payload: number = 1) {
			return {
				...state,
				value: state.value + payload,
			}
		},
		setString(state, payload: customType) {
			return {
				...state,
				s: payload,
			}
		},
	},
	actions: {
		async asyncAdd(arg0: number) {
			this.addValue(arg0)
		},
		async asyncStr(arg0: number, arg1?: customType) {
			if (arg1) {
				this.addValue(arg0)
			}
		},
	},
	views: {
		viewNumber(args: number) {
			return this.value + args
		},
		viewString(args?: customType) {
			return this.s + args || ''
		},
	},
})

type countSelectorParameters = ISelectorParams<typeof count>
const countSelector = function (stateAndViews: countSelectorParameters) {
	return {
		v: stateAndViews.value,
		n: stateAndViews.viewNumber(1),
		s: stateAndViews.viewString(),
		custom: stateAndViews.viewString('custom'),
	}
}

const count$State = function (stateAndViews: countSelectorParameters) {
	return stateAndViews.$state
}
