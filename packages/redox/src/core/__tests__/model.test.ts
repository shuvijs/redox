import { AnyModel } from '../defineModel'
import { ModelInternal } from '../model'

const createModel = (options: AnyModel, initState?: any) =>
  new ModelInternal(options, initState)

describe('model', () => {
  test('getState should return raw state', () => {
    const originState = {
      arr: [1, 2],
    }
    const model = createModel({
      state: originState,
      views: {
        firstOfArr() {
          return this.arr[0]
        },
      },
    })

    const state = model.getState() as any
    expect(state).toBe(originState)
  })

  test('getSnapshot should return raw state and views', () => {
    const originState = {
      arr: [1, 2],
    }
    const model = createModel({
      state: originState,
      views: {
        firstOfArr() {
          return this.arr[0]
        },
      },
    })

    const snapshot = model.getSnapshot() as any
    expect(snapshot).toEqual({
      $state: {
        arr: [1, 2],
      },
      arr: [1, 2],
      firstOfArr: 1,
    })
    expect(snapshot.arr).toBe(originState.arr)
  })
})
