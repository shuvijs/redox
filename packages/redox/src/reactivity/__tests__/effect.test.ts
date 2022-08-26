import { reactive } from '../reactive'
import { TrackOpTypes } from '../operations'
import { effect } from '../effect'
import { view } from '../view'

describe('reactivity/effect', () => {
  it('should run the passed function once (wrapped by a effect)', () => {
    const fnSpy = jest.fn(() => {})
    effect(fnSpy)
    expect(fnSpy).toHaveBeenCalledTimes(1)
  })

  it('should observe basic properties', () => {
    let dummy
    let dummy1
    const object = { num: 0 }
    const counter = reactive(object)
    const runner = effect(() => {
      dummy = counter.num
      dummy1 = 'foo' in counter
    })

    expect(dummy).toBe(0)
    expect(dummy1).toBe(false)
    const records = runner.effect.targetMap.get(object)?.record
    expect(records).toBeDefined()
    expect(records!.get('num')).toEqual({
      type: TrackOpTypes.GET,
      value: 0,
    })
    expect(records!.get('foo')).toEqual({
      type: TrackOpTypes.HAS,
      value: false,
    })
  })

  it('should observe view', () => {
    let dummy1
    let dummy2
    const store = {
      state: {
        num: 1,
      },
    }
    const $state = reactive(store.state, () => store.state)
    const double = view(() => $state.num * 2)
    const runner = effect(() => {
      dummy1 = $state.num
      dummy2 = double.value
    })

    expect(dummy1).toBe(1)
    expect(dummy2).toBe(2)
    const reactiveRecords = runner.effect.targetMap.get(store.state)?.record
    expect(reactiveRecords).toBeDefined()
    expect(reactiveRecords!.get('num')).toEqual({
      type: TrackOpTypes.GET,
      value: 1,
    })
    const viewsRecord = runner.effect.views.get(double)
    expect(viewsRecord).toBe(2)
  })
})
