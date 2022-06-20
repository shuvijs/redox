import { defineModel } from '@shuvi/redox'
import { expectType, ISelectorParams, useModel, useRootModel } from './'

import { Action } from '../../redox/dist'

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

function Test() {
	const [state, action] = useModel(count, countSelector)
	expectType<number>(state.n)
	expectType<number>(state.v)
	expectType<string>(state.s)
	expectType<string>(state.custom)
	expectType<Action<number | undefined>>(action.addValue())
	expectType<Action<customType>>(action.setString('custom'))
	expectType<Promise<void>>(action.asyncAdd(0))

	const [rootState, rootAction] = useRootModel(count, countSelector)
	expectType<number>(rootState.n)
	expectType<number>(rootState.v)
	expectType<string>(rootState.s)
	expectType<string>(rootState.custom)
	expectType<Action<number | undefined>>(rootAction.addValue())
	expectType<Action<customType>>(rootAction.setString('custom'))
	expectType<Promise<void>>(rootAction.asyncAdd(0))
}
