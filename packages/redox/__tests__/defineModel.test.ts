import { defineModel, redox } from '../src'

let manager: ReturnType<typeof redox>

beforeEach(() => {
	manager = redox()
	process.env.NODE_ENV = 'development'
})

describe('defineModel worked:', () => {
	test('should return the model', () => {
		const model = {
			name: 'a',
			state: {},
			reducers: {},
		}

		const modelA = defineModel(model)

		expect(model).toBe(modelA)
	})

	describe('defineModel valid:', () => {
		test('model is necessary', () => {
			expect(() => {
				// @ts-ignore
				const modelA = defineModel()
			}).toThrow()
		})

		test('name is not necessary', () => {
			expect(() => {
				const modelA = defineModel(
					// @ts-ignore
					{
						state: {},
						reducers: {},
					}
				)
			}).not.toThrow()
		})

		test('reducers is necessary', () => {
			expect(() => {
				const modelA = defineModel(
					// @ts-ignore
					{
						name: 'a',
						state: {},
					}
				)
			}).toThrow()
		})

		test('state is necessary', () => {
			expect(() => {
				const modelA = defineModel(
					// @ts-ignore
					{
						name: 'a',
						reducers: {},
					}
				)
			}).toThrow()
		})

		test('state should be object', () => {
			expect(() => {
				const modelA = defineModel({
					name: 'a',
					// @ts-ignore
					state: 1,
					reducers: {},
				})
			}).toThrow()
		})

		test('reducers should be object', () => {
			expect(() => {
				const modelA = defineModel({
					name: 'a',
					state: {},
					// @ts-ignore
					reducers: 1,
				})
			}).toThrow()
		})

		test('reducer should be function', () => {
			expect(() => {
				const modelA = defineModel({
					name: 'a',
					state: {},
					reducers: {
						// @ts-ignore
						1: 1,
					},
				})
			}).toThrow()
		})

		test('actions should be object', () => {
			expect(() => {
				const modelA = defineModel({
					name: 'a',
					state: {},
					reducers: {},
					// @ts-ignore
					actions: 1,
				})
			}).toThrow()
		})

		test('action should be function', () => {
			expect(() => {
				const modelA = defineModel({
					name: 'a',
					state: {},
					reducers: {},
					actions: {
						// @ts-ignore
						1: 1,
					},
				})
			}).toThrow()
		})

		test('views should be object', () => {
			expect(() => {
				const modelA = defineModel({
					name: 'a',
					state: {},
					reducers: {},
					// @ts-ignore
					views: 1,
				})
			}).toThrow()
		})

		test('view should be function', () => {
			expect(() => {
				const modelA = defineModel({
					name: 'a',
					state: {},
					reducers: {},
					views: {
						// @ts-ignore
						1: 1,
					},
				})
			}).toThrow()
		})

		test('not allow repeat key state views', () => {
			expect(() => {
				const model = defineModel({
					name: 'a',
					state: {
						a: 0,
					},
					reducers: {},
					views: {
						a() {},
					},
				})
			}).toThrow()
		})

		test('not allow repeat key reducers actions views', () => {
			expect(() => {
				const model = defineModel({
					name: 'a',
					state: {},
					reducers: {
						a() {},
					},
					actions: {
						async a() {},
					},
				})
			}).toThrow()
			expect(() => {
				const model = defineModel({
					name: 'a',
					state: {},
					reducers: {
						a() {},
					},
					views: {
						a() {},
					},
				})
			}).toThrow()
		})

		test('depends should be array or undefined', () => {
			expect(() => {
				const modelA = defineModel(
					{
						name: 'a',
						state: {},
						reducers: {},
					},
					// @ts-ignore
					{}
				)
			}).toThrow()

			expect(() => {
				const modelB = defineModel({
					name: 'a',
					state: {},
					reducers: {},
				})
				const modelC = defineModel(
					{
						name: 'a',
						state: {},
						reducers: {},
					},
					[]
				)
			}).not.toThrow()
		})
	})
})
