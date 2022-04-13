import { defineModel, redox } from '../src'

let manager: ReturnType<typeof redox>

beforeEach(() => {
	manager = redox()
})

test('should return the model', () => {
	const model = {
		name: 'a',
		state: {},
		reducers: {},
	}

	const modelA = defineModel(model)

	expect(model).toBe(modelA)
})
