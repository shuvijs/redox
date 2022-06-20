import { defineModel, redox, expectType, Action } from './'

const manager = redox()

interface State {
	count: number
}

const model = defineModel({
	name: 'model',
	state: {
		count: 0,
	},
	actions: {
		accessibleThisValue() {
			expectType<State>(this.$state())
			expectType<void>(this.$set({ count: 0 }))
			expectType<void>(this.$modify((_) => {}))
			expectType<number>(this.getValue())
			expectType<Promise<void>>(this.asyncAdd(1))
			expectType<void>(this.viewFunction())
			expectType<Action>(this.add(1))
		},
		otherAction() {
			return this.getValue()
		},
		getValue(): number {
			this.otherAction()
			return this.$state().count
		},
		triggerReducer() {
			this.add(1)
		},
		async asyncAdd(payload: number): Promise<void> {
			await this.add(payload)
		},
	},
	reducers: {
		add(state, payload) {
			state.count += payload
		},
	},
	views: {
		viewFunction() {},
	},
})

const store = manager.get(model)

expectType<number>(store.getValue())
expectType<number>(store.otherAction())
expectType<void>(store.triggerReducer())
//@ts-expect-error
store.add()
store.$modify((state) => {
	expectType<number>(state.count)
	//@ts-expect-error
	state.count = ''
})

expectType<void>(store.$set(0))
expectType<void>(store.$set(''))
expectType<void>(store.$set(false))
expectType<void>(store.$set([]))

//@ts-expect-error
store.$set(BigInt(1))
//@ts-expect-error
store.$set(Symbol(1))

expectType<State>(store.$state())
