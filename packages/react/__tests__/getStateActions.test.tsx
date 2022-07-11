/**
 * @jest-environment jsdom
 */

import { redox } from '@shuvi/redox'
import { getStateActions } from '../src/getStateActions'
import { countModel } from './models'

let storeManager: ReturnType<typeof redox>
beforeEach(() => {
	storeManager = redox()
})

describe('getStateActions', () => {
	describe('should work', () => {
		test('should return tuplify array with two element', async () => {
			const res = getStateActions(countModel, storeManager)
			expect(Array.isArray(res)).toBeTruthy()
			expect(res.length).toBe(2)
		})

		test("fist should redox's stateAndViews", async () => {
			const res = getStateActions(countModel, storeManager)
			const countStore = storeManager.get(countModel)
			expect(res[0]).toBe(countStore.$stateAndViews)
		})

		test("second is redox's actions", async () => {
			const res = getStateActions(countModel, storeManager)
			const countStore = storeManager.get(countModel)
			expect(res[1]).toBe(countStore.$actions)
		})

		test('should run selector if define selector', async () => {
			const res = getStateActions(countModel, storeManager, () => 1)
			expect(res[0]).toStrictEqual(1)
		})
	})
})
