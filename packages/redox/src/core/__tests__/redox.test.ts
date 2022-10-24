import { defineModel, redox, Plugin } from '../'
import { nextTick } from '../scheduler'

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
      actions: {
        actionOne() {},
      },
      views: {
        viewOne() {},
      },
    })

    const store = redoxStore.getModel(model)
    expect(typeof store.$state).toBe('object')
    expect(typeof store.$actions).toBe('object')
    expect(typeof store.$views).toBe('object')
    expect(typeof store.$patch).toBe('function')
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

  it('should access dependencies by name', async () => {
    redoxStore = redox()
    const depend = defineModel({
      name: 'depend',
      state: { depend: 0 },
      actions: {
        increment(v: number) {
          this.depend += v
        },
      },
    })
    const count = defineModel(
      {
        name: 'count',
        state: { value: 0 },
        actions: {
          increment(v: number) {
            this.value += v
          },
          dependAdd() {
            this.$dep.depend.increment(1)
          },
        },
      },
      [depend]
    )

    const store = redoxStore.getModel(count)
    store.dependAdd()
    await nextTick()
    expect(redoxStore.getState()).toEqual({
      count: { value: 0 },
      depend: { depend: 1 },
    })
  })

  it('should access dependencies by index', async () => {
    redoxStore = redox()
    const depend = defineModel({
      state: { depend: 0 },
      actions: {
        increment(v: number) {
          this.depend += v
        },
      },
    })
    const count = defineModel(
      {
        name: 'count',
        state: { value: 0 },
        actions: {
          increment(v: number) {
            this.value += v
          },
          dependAdd() {
            this.$dep[0].increment(1)
          },
        },
      },
      [depend]
    )

    const store = redoxStore.getModel(count)
    store.dependAdd()
    await nextTick()
    expect(redoxStore.getState()).toEqual({
      count: { value: 0 },
      _: [{ depend: 1 }],
    })
  })

  it('getState should return the newest state', async () => {
    redoxStore = redox()
    const count0 = defineModel({
      name: 'count0',
      state: { value: 0 },
      actions: {
        increment(v: number) {
          this.value += v
        },
      },
    })
    const count1 = defineModel({
      name: 'count1',
      state: { value: 0 },
      actions: {
        increment(v: number) {
          this.value += v
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
    store1.increment(2)
    await nextTick()
    expect(redoxStore.getState()).toEqual({
      count0: { value: 1 },
      count1: { value: 2 },
    })
  })

  it('should destroy', () => {
    redoxStore = redox()
    const model = defineModel({
      name: 'model',
      state: { value: 0 },
      actions: {
        increment(v: number) {
          this.value += v
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

  it('subscribes and unsubscribes should work', async () => {
    redoxStore = redox()
    let firstCount = 0
    const first = defineModel({
      name: 'first',
      state: { value: 0 },
      actions: {
        addOne() {
          this.value += 1
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
      actions: {
        add(n: number) {
          this.value += n
        },
      },
    })
    const secondStore = redoxStore.getModel(second)
    const unSubscribeSecond = redoxStore.subscribe(second, () => {
      secondCount++
    })

    firstStore.addOne()
    await nextTick()
    expect(firstCount).toBe(1)
    firstStore.addOne()
    await nextTick()
    expect(firstCount).toBe(2)
    expect(firstStore.$state).toStrictEqual({ value: 2 })
    expect(secondStore.$state).toStrictEqual({ value: 0 })

    secondStore.add(5)
    await nextTick()
    expect(secondCount).toBe(1)
    expect(secondStore.$state).toStrictEqual({ value: 5 })

    unSubscribeSecond()
    secondStore.add(5)
    await nextTick()
    expect(secondCount).toBe(1)
  })

  it('should trigger change when dependencies have changed', async () => {
    redoxStore = redox()
    let dependCount = 0
    let storeCount = 0
    const first = defineModel({
      name: 'first',
      state: { value: 0 },
      actions: {
        addOne() {
          this.value += 1
        },
      },
    })
    const depend = redoxStore.getModel(first)
    redoxStore.subscribe(first, () => {
      dependCount++
    })
    const second = defineModel(
      {
        name: 'second',
        state: { value: 0 },
        actions: {
          add(n: number) {
            this.value += n
          },
        },
      },
      [first]
    )

    const store = redoxStore.getModel(second)
    redoxStore.subscribe(second, () => {
      storeCount++
    })

    depend.addOne()
    await nextTick()
    expect(dependCount).toBe(1)
    expect(storeCount).toBe(1)
    depend.addOne()
    await nextTick()
    expect(dependCount).toBe(2)
    expect(storeCount).toBe(2)
    store.add(1)
    await nextTick()
    expect(dependCount).toBe(2)
    expect(storeCount).toBe(3)
  })

  describe('plugin', () => {
    it('should have the proper api', () => {
      const onInit = jest.fn()
      const onModel = jest.fn()
      const onModelInstance = jest.fn()
      const onDestroy = jest.fn()
      const plugin: Plugin = () => {
        return {
          onInit,
          onModel,
          onModelInstance,
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
      expect(typeof onModelInstance.mock.calls[0][0].dispatch).toBe('function')

      redoxStore.destroy()
      expect(onDestroy).toHaveBeenCalledWith()
    })
  })
})
