/**
 * @jest-environment jsdom
 */

import { redox } from '@shuvi/redox'
import { getStateActions } from '../src/getStateActions'
import { countModel } from './models'

let redoxStore: ReturnType<typeof redox>
beforeEach(() => {
  redoxStore = redox()
})

describe('getStateActions', () => {
  describe('should work', () => {
    test('should return tuplify array with two element', async () => {
      const res = getStateActions(countModel, redoxStore)
      expect(Array.isArray(res)).toBeTruthy()
      expect(res.length).toBe(2)
    })

    test("fist should redox's inner proxy", async () => {
      const res = getStateActions(countModel, redoxStore)
      const countStore = redoxStore.getModel(countModel)
      expect(res[0]).toBe(countStore.__proxy)
    })

    test("second is redox's actions", async () => {
      const res = getStateActions(countModel, redoxStore)
      const countStore = redoxStore.getModel(countModel)
      expect(res[1]).toBe(countStore.$actions)
    })

    test('should run selector if define selector', async () => {
      const res = getStateActions(countModel, redoxStore, () => 1)
      expect(res[0]).toStrictEqual(1)
    })
  })
})
