import { defineModel } from '@shuvi/redox'

export const sleep = (time: number) => new Promise((resolve) => {
	setTimeout(() => {
		resolve(null)
	}, time)
})

export const stepModel = defineModel({
	name: 'stepModel',
  state: {
    step: 1
  },
	reducers: {
		addOneStep(state) {
      return {
        ...state,
        step: state.step + 1
      };
    },
    addStep(state, payload: number) {
      return {
        ...state,
        step: state.step + payload
      };
    },
  },
	effects: {
		addStepByEffect(payload: number) {
			this.addStep(payload)
		}
	}
});

export const countModel = defineModel({
	name: 'countModel',
  state: {
    value: 1,
    value1: 1
  },
	reducers: {
    addValue(state) {
      return {
        ...state,
        value: state.value + 1
      };
    },
    addValue1(state) {
      return {
        ...state,
        value1: state.value1 + 1
      };
    },
		addValueByParam(state, payload: number){
			return {
				...state,
				value: state.value + payload
			}
		}
  },
	effects: {
		addValueByEffect() {
			this.addValue()
		},
		addValueByEffectAndState(_: void, state) {
			this.addValueByParam(state.value1 + state.value)
		},
		async addValueByEffectAsync() {
			await sleep(200)
			this.addValue()
		},
		addValueByEffectWithPaload(payload: number) {
			this.addValueByParam(payload)
		},
		addValueByEffectWithPaloadAndMeta(payload: number, _state, _depends) {
			this.addValueByParam(payload)
		},
		addValueByDependsState(_payload: void, _state, depends) {
			const { getState } = depends
			this.addValueByParam(getState().stepModel.step)
		},
		addStepByDependsDispatch(_payload: void, _state, depends) {
			const { dispatch: { stepModel } } = depends
			stepModel.addOneStep()
		}
	}
}, [ stepModel ]);
