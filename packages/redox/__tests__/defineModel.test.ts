import { defineModel, redox } from '../src'

let manager: ReturnType<typeof redox>

beforeEach(() => {
	manager = redox()
})

test('should work', () => {
	const model = {
		name: 'a',
		state: {},
		reducers: {},
	}

	const modelA = defineModel(model)
	const modelB = defineModel(model)

	expect(model).toBe(modelA)
	expect(modelA).toBe(modelB)
})
