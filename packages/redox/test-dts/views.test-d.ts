import { defineModel, redox, expectType } from './'

const manager = redox()

interface depState {
	count: number
}

interface storeState {
	text: string
}

const depModel = defineModel({
	name: 'depModel',
	state: {
		count: 0,
	},
	views: {
		double() {
			return this.count * 2
		},
		increment() {
			expectType<number>(this.count)
			expectType<number>(this.double)
			expectType<{}>(this.$dep)
		},
	},
})

const model = defineModel(
	{
		name: 'model',
		state: {
			text: 'initial',
		},
		reducers: {
			reset(state) {
				state.text = 'initial'
			},
		},
		views: {
			setText() {
				expectType<{ depModel: { $state: depState } & depState }>(this.$dep)
				expectType<depState>(this.$dep.depModel.$state)
				expectType<number>(this.$dep.depModel.double)
				expectType<number>(this.$dep.depModel.count)
				expectType<storeState>(this.$state)
				expectType<string>(this.text)
				expectType<void>(this.setText)
			},
		},
	},
	[depModel]
)

const store = manager.get(model)
const depStore = manager.get(depModel)

expectType<void>(store.setText)
expectType<storeState>(store.$state)
expectType<number>(depStore.double)
expectType<depState>(depStore.$state)
