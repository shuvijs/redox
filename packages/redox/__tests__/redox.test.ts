import { defineModel, redox, Plugin } from '../src/index'
let redoxStore: ReturnType<typeof redox>

describe('redox', () => {
  it('always return a new instance', () => {
    const redoxStoreA = redox()
    const redoxStoreB = redox()
    expect(redoxStoreA).not.toBe(redoxStoreB)
  })

  it('should have the proper api', () => {
    redoxStore = redox()
    const model = defineModel({
      name: 'model',
      state: { value: 0 },
      reducers: {
        reducerOne: (state) => {
          return { value: state.value + 1 }
        },
      },
      actions: {
        actionOne() {},
      },
      views: {
        viewOne() {},
      },
    })

    const store = redoxStore.getModel(model)
    expect(typeof store.$state).toBe('object')
    expect(typeof store.$modify).toBe('function')
    expect(typeof store.$set).toBe('function')
    expect(typeof store.reducerOne).toBe('function')
    expect(typeof store.actionOne).toBe('function')
    expect(typeof store.viewOne).toBe('undefined')
  })

  it('should init store by initialStage', () => {
    redoxStore = redox({
      initialState: {
        one: {
          value: 'one',
        },
        two: {
          value: 'two',
        },
      },
    })
    const modelOne = defineModel({
      name: 'one',
      state: { value: 0 },
    })
    const modelTwo = defineModel({
      name: 'two',
      state: { value: 0 },
    })
    const storeOne = redoxStore.getModel(modelOne)
    const storeTwo = redoxStore.getModel(modelTwo)
    expect(storeOne.$state.value).toBe('one')
    expect(storeTwo.$state.value).toBe('two')
  })

  it('should init dependencies', () => {
    redoxStore = redox()
    const depend = defineModel({
      name: 'depend',
      state: { depend: 0 },
      reducers: {
        increment(state, payload: number) {
          state.depend = state.depend + payload
        },
      },
    })
    const count = defineModel(
      {
        name: 'count',
        state: { value: 0 },
        reducers: {
          increment(state, payload: number) {
            state.value = state.value + payload
          },
        },
        actions: {
          dependAdd() {
            this.$dep.depend.increment(1)
          },
        },
      },
      [depend]
    )

    const store = redoxStore.getModel(count)
    store.dependAdd()
    expect(redoxStore.getState()).toEqual({
      count: { value: 0 },
      depend: { depend: 1 },
    })
  })

  it('should access dependencies by index', () => {
    redoxStore = redox()
    const depend = defineModel({
      state: { depend: 0 },
      reducers: {
        increment(state, payload: number) {
          state.depend = state.depend + payload
        },
      },
    })
    const count = defineModel(
      {
        name: 'count',
        state: { value: 0 },
        reducers: {
          increment(state, payload: number) {
            state.value = state.value + payload
          },
        },
        actions: {
          dependAdd() {
            this.$dep[0].increment(1)
          },
        },
      },
      [depend]
    )

    const store = redoxStore.getModel(count)
    store.dependAdd()
    expect(redoxStore.getState()).toEqual({
      count: { value: 0 },
      0: { depend: 1 },
    })
  })

  it('getState should return the newest state', () => {
    redoxStore = redox()
    const count0 = defineModel({
      name: 'count0',
      state: { value: 0 },
      reducers: {
        increment(state, payload: number) {
          state.value = state.value + payload
        },
      },
    })
    const count1 = defineModel({
      name: 'count1',
      state: { value: 0 },
      reducers: {
        increment(state, payload: number) {
          state.value = state.value + payload
        },
      },
    })

    const store0 = redoxStore.getModel(count0)
    const store1 = redoxStore.getModel(count1)
    expect(redoxStore.getState()).toEqual({
      count0: { value: 0 },
      count1: { value: 0 },
    })
    store0.increment(1)
    expect(redoxStore.getState()).toEqual({
      count0: { value: 1 },
      count1: { value: 0 },
    })
  })

  it('should destroy', () => {
    redoxStore = redox()
    const model = defineModel({
      name: 'model',
      state: { value: 0 },
      reducers: {
        increment(state, payload: number = 1) {
          state.value = state.value + payload
        },
      },
    })

    const store = redoxStore.getModel(model)
    store.increment(1)
    expect(store.$state.value).toBe(1)

    redoxStore.destroy()
    const newStore = redoxStore.getModel(model)
    expect(newStore).not.toBe(store)
    expect(newStore.$state.value).toBe(0)
  })

  it('subscribes and unsubscribes should work', () => {
    redoxStore = redox()
    let firstCount = 0
    const first = defineModel({
      name: 'first',
      state: { value: 0 },
      reducers: {
        addOne: (state) => {
          return { value: state.value + 1 }
        },
      },
    })
    const firstStore = redoxStore.getModel(first)
    redoxStore.subscribe(first, () => {
      firstCount++
    })
    let secondCount = 0
    const second = defineModel({
      name: 'second',
      state: { value: 0 },
      reducers: {
        addOne: (state, payload: number) => ({
          value: state.value + payload,
        }),
      },
    })
    const secondStore = redoxStore.getModel(second)
    const unSubscribeSecond = redoxStore.subscribe(second, () => {
      secondCount++
    })

    firstStore.addOne()
    expect(firstCount).toBe(1)
    firstStore.addOne()
    expect(firstCount).toBe(2)
    expect(firstStore.$state).toStrictEqual({ value: 2 })
    expect(secondStore.$state).toStrictEqual({ value: 0 })

    secondStore.addOne(5)
    expect(secondCount).toBe(1)
    expect(secondStore.$state).toStrictEqual({ value: 5 })

    unSubscribeSecond()
    secondStore.addOne(5)
    expect(secondCount).toBe(1)
  })

  it('should trigger change when dependencies have changed', () => {
    redoxStore = redox()
    let dependCount = 0
    let storeCount = 0
    const first = defineModel({
      name: 'first',
      state: { value: 0 },
      reducers: {
        addOne: (state) => {
          return { value: state.value + 1 }
        },
      },
    })
    const depend = redoxStore.getModel(first)
    redoxStore.subscribe(first, () => {
      console.log('dependCount: ', dependCount)
      dependCount++
    })
    const second = defineModel(
      {
        name: 'second',
        state: { value: 0 },
        reducers: {
          addOne: (state, payload: number) => ({
            value: state.value + payload,
          }),
        },
      },
      [first]
    )

    const store = redoxStore.getModel(second)
    redoxStore.subscribe(second, () => {
      storeCount++
    })

    depend.addOne()
    expect(dependCount).toBe(1)
    expect(storeCount).toBe(1)
    depend.addOne()
    expect(dependCount).toBe(2)
    expect(storeCount).toBe(2)
    store.addOne(1)
    expect(dependCount).toBe(2)
    expect(storeCount).toBe(3)
  })

  describe('plugin', () => {
    it('should have the proper api', () => {
      const onInit = jest.fn()
      const onModel = jest.fn()
      const onModelInstanced = jest.fn()
      const onDestroy = jest.fn()
      const plugin: Plugin = () => {
        return {
          onInit,
          onModel,
          onModelInstanced,
          onDestroy,
        }
      }

      let initialState = {}
      const redoxStore = redox({
        initialState,
        plugins: [[plugin, {}]],
      })

      expect(onInit).toHaveBeenCalledWith(redoxStore, initialState)

      const model = defineModel({
        name: 'model',
        state: { value: '' },
      })
      redoxStore.getModel(model)
      expect(onModel).toHaveBeenCalledWith(model)
      expect(typeof onModelInstanced.mock.calls[0][0].dispatch).toBe('function')

      redoxStore.destroy()
      expect(onDestroy).toHaveBeenCalledWith()
    })
  })
})
