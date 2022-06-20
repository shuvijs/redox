/**
 * @jest-environment jsdom
 */

import { redox } from '@shuvi/redox'
import { getStateActions } from '../src/getStateActions'
import { countModel } from './models'

let modelManager: ReturnType<typeof redox>
beforeEach(() => {
	modelManager = redox()
})

describe('getStateActions', () => {
	describe('should work', () => {
		test('should return tuplify array with two element', async () => {
			const res = getStateActions(countModel, modelManager)
			expect(Array.isArray(res)).toBeTruthy()
			expect(res.length).toBe(2)
		})

		test("fist should redox's state", async () => {
			const res = getStateActions(countModel, modelManager)
			const countStore = modelManager._getRedox(countModel)
			expect(res[0]).toBe(countStore.$state())
		})

		test("second is redox's actions", async () => {
			const res = getStateActions(countModel, modelManager)
			const countStore = modelManager._getRedox(countModel)
			expect(res[1]).toBe(countStore.$actions)
		})

		describe('support selector', () => {
			test('should access model state', async () => {
				const res = getStateActions(
					countModel,
					modelManager,
					function (stateAndViews) {
						return stateAndViews.value
					}
				)
				expect(res[0]).toStrictEqual(1)
			})

			test('should access model views', async () => {
				const res = getStateActions(
					countModel,
					modelManager,
					function (stateAndViews) {
						return stateAndViews.test(1)
					}
				)
				expect(res[0]).toStrictEqual(2)
			})
		})
	})
})
