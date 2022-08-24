import { defineModel, redox, ModelSnapshot } from '../src'

let redoxStore: ReturnType<typeof redox>
beforeEach(() => {
  redoxStore = redox()
})

let oldEnv: any
beforeAll(() => {
  oldEnv = process.env.NODE_ENV
  process.env.NODE_ENV = 'development'
})
afterAll(() => {
  process.env.NODE_ENV = oldEnv
})

describe('defineModel/views', () => {
  it('should throw if changed state in a view', () => {
    let initState = {
      a: 0,
    }
    const model = defineModel({
      name: 'model',
      state: initState,
      views: {
        view() {
          this.a = 1
          return this.$state
        },
      },
    })
    const store = redoxStore.getModel(model)
    expect(() => store.view).toThrow()
    expect('Cannot change state in view function').toHaveBeenWarned()
  })

  it('$state and any view should be object', () => {
    const model = defineModel({
      name: 'modal',
      state: {
        a: {},
      },
      reducers: {},
      views: {
        This() {
          return this
        },
        anyView() {
          return this.a
        },
      },
    })

    const modelStore = redoxStore.getModel(model)

    const This = modelStore.This

    expect(typeof This.$state).toBe('object')
    expect(typeof This.anyView).toBe('object')
  })

  it('should return same reference if no update', () => {
    const sample = defineModel({
      name: 'sample',
      state: {
        a: { foo: 'bar' },
        b: 1,
      },
      reducers: {
        changeB(state) {
          return {
            ...state,
            b: state.b + 1,
          }
        },
      },
      views: {
        viewA() {
          void this.a
          return {}
        },
      },
    })
    const store = redoxStore.getModel(sample)

    const value = store.viewA
    store.changeB()
    expect(store.viewA).toBe(value)
  })

  it('should support lazy property', () => {
    redoxStore = redox()
    interface IErrorState {
      error?: string
    }
    const error = defineModel({
      name: 'error',
      state: {} as IErrorState,
      views: {
        hasError() {
          return typeof this.error !== 'undefined'
        },
      },
    })

    const store = redoxStore.getModel(error)
    expect(store.hasError).toBeFalsy()
    store.$set({ error: 'e' })
    expect(store.hasError).toBeTruthy()
  })

  it('should always return same reference if no depends', () => {
    const sample = defineModel({
      name: 'sample',
      state: {
        a: { foo: 'bar' },
        b: 1,
      },
      reducers: {
        changeA(state) {
          return {
            ...state,
            a: { foo: 'foo' },
          }
        },
        changeB(state) {
          return {
            ...state,
            b: state.b + 1,
          }
        },
      },
      views: {
        test() {
          return {}
        },
      },
    })
    const store = redoxStore.getModel(sample)

    const value = store.test
    store.changeB()
    store.changeA()
    expect(store.test).toBe(value)
    // $state still init state
    expect(store.test).toBe(value)
  })

  it("should not be invoked when deps don't change", () => {
    let calltime = 0
    const sample = defineModel({
      name: 'sample',
      state: {
        a: 0,
        b: 1,
      },
      reducers: {
        changeA(state) {
          return {
            ...state,
            a: state.a + 1,
          }
        },
      },
      views: {
        doubleB() {
          calltime++
          return this.b * 2
        },
      },
    })
    const store = redoxStore.getModel(sample)

    expect(calltime).toBe(0)
    store.doubleB
    expect(calltime).toBe(1)
    store.changeA()
    store.doubleB
    expect(calltime).toBe(1)
  })

  it("should not be invoked when deps don't change (complex)", () => {
    let sampleComputeTimes = 0
    const sample = defineModel({
      name: 'sample',
      state: {
        value: 0,
        value1: {
          a: {
            b: 'b',
          },
        },
      },
      reducers: {
        change(state) {
          return {
            ...state,
            value: 1,
          }
        },
      },
      views: {
        sampleView() {
          const value1 = this.value1
          sampleComputeTimes++
          const a = value1.a
          return a.b
        },
      },
    })
    const store = redoxStore.getModel(sample)

    expect(sampleComputeTimes).toBe(0)
    store.sampleView
    expect(sampleComputeTimes).toBe(1)
    store.change()
    store.sampleView
    expect(sampleComputeTimes).toBe(1)
  })

  it("should not be invoked when deps don't change (nested views)", () => {
    let selfViewComputeTimes = 0
    const selfView = defineModel({
      name: 'selfView',
      state: {
        value: 0,
        value1: {
          a: {
            b: 'b',
          },
        },
      },
      reducers: {
        change(state) {
          return {
            ...state,
            value: 1,
          }
        },
      },
      views: {
        selfView() {
          const value1 = this.value1
          selfViewComputeTimes++
          return value1.a
        },
        objView() {
          return this.selfView
        },
      },
    })
    const store = redoxStore.getModel(selfView)

    expect(selfViewComputeTimes).toBe(0)

    store.objView
    expect(selfViewComputeTimes).toBe(1)
    store.change()
    store.objView
    expect(selfViewComputeTimes).toBe(1)
  })

  test("should not be invoked when deps don't change (this.$state())", () => {
    let calltime = 0
    const model = defineModel({
      name: 'model',
      state: {
        foo: 'bar',
      },
      reducers: {
        changeValue: (state) => {
          state.foo = 'zoo'
        },
      },
      views: {
        getFoo() {
          calltime++
          return this.$state.foo
        },
      },
    })

    const store = redoxStore.getModel(model)
    expect(calltime).toBe(0)
    store.getFoo
    store.getFoo
    expect(calltime).toBe(1)

    store.changeValue()
    store.getFoo
    expect(calltime).toBe(2)
  })

  it('should return last value', () => {
    let calltime = 0
    const sample = defineModel({
      name: 'sample',
      state: {
        a: 0,
        b: {},
        c: {
          foo: 'bar',
        },
      },
      reducers: {
        changeA(state, newValue: number) {
          return {
            ...state,
            a: newValue,
          }
        },
        changeB(state, newValue: any) {
          return {
            ...state,
            b: newValue,
          }
        },
        changeC(state, newValue: string) {
          return {
            ...state,
            c: {
              ...state.c,
              foo: newValue,
            },
          }
        },
      },
      views: {
        viewA() {
          calltime++
          return this.a
        },
        viewB() {
          calltime++
          return this.b
        },
        viewC() {
          calltime++
          return this.c.foo
        },
      },
    })
    const store = redoxStore.getModel(sample)

    store.changeA(10)
    expect(calltime).toBe(0)
    expect(store.viewA).toBe(10)
    expect(store.viewA).toBe(10)
    expect(calltime).toBe(1)
    let newB = {}
    store.changeB(newB)
    expect(calltime).toBe(1)
    expect(store.viewB).toStrictEqual(newB)
    expect(store.viewB).toStrictEqual(newB)
    expect(calltime).toBe(2)
    store.changeC('zoo')
    expect(calltime).toBe(2)
    expect(store.viewC).toBe('zoo')
    expect(store.viewC).toBe('zoo')
    expect(calltime).toBe(3)
  })

  it('should return last value (replace state)', () => {
    let initState = {
      a: 0,
    }
    const model = defineModel({
      name: 'model',
      state: initState,
      reducers: {
        replaceState(_state, newState: any) {
          return newState
        },
      },
      views: {
        view() {
          return this.$state
        },
      },
    })
    const store = redoxStore.getModel(model)
    expect(store.view).toStrictEqual(initState)
    const newState = {}
    store.replaceState(newState)
    expect(store.view).toStrictEqual(newState)
  })

  it('should return last value (using this.$state() in view)', () => {
    let numberOfCalls = 0
    const immerExample = defineModel({
      name: 'immerExample',
      state: {
        other: 'other value',
        level1: {
          level2: {
            level3: 'initial',
          },
        },
      },
      reducers: {
        assignNewObject: (state) => {
          state.level1.level2 = {
            level3: 'initial',
          }
        },
        changeValue: (state, payload: string) => {
          state.level1.level2 = {
            level3: payload,
          }
        },
      },
      views: {
        getState() {
          numberOfCalls++
          return this.$state
        },
        getLevel1() {
          numberOfCalls++
          return this.$state.level1
        },
        getLevel2() {
          numberOfCalls++
          return this.$state.level1.level2
        },
        getLevel3() {
          numberOfCalls++
          return this.$state.level1.level2.level3
        },
      },
    })

    const store = redoxStore.getModel(immerExample)

    expect(numberOfCalls).toBe(0)

    store.getState
    expect(numberOfCalls).toBe(1)

    const level1 = store.getLevel1
    expect(numberOfCalls).toBe(2)

    const level2 = store.getLevel2
    expect(numberOfCalls).toBe(3)

    const level3 = store.getLevel3
    expect(numberOfCalls).toBe(4)

    store.$modify((state) => {
      state.other = 'modify other value'
    })

    expect(store.getLevel1).toBe(level1)
    expect(numberOfCalls).toBe(5)

    expect(store.getLevel2).toBe(level2)
    expect(numberOfCalls).toBe(6)

    expect(store.getLevel3).toBe(level3)
    expect(numberOfCalls).toBe(7)
  })

  describe('view with depends', () => {
    it('should not be invoked if no dep update', () => {
      const modelA = defineModel({
        name: 'modelA',
        state: {
          a: 0,
          b: 1,
        },
        reducers: {
          changeB(state) {
            return {
              ...state,
              b: state.b + 1,
            }
          },
        },
      })
      let calltime = 0
      const sample = defineModel(
        {
          name: 'sample',
          state: {},
          reducers: {},
          views: {
            viewA() {
              calltime++
              return this.$dep.modelA.a
            },
          },
        },
        [modelA]
      )
      const store = redoxStore.getModel(sample)

      expect(calltime).toBe(0)
      store.viewA
      expect(calltime).toBe(1)
      redoxStore.getModel(modelA).changeB()
      store.viewA
      expect(calltime).toBe(1)
    })

    it('should return last state', () => {
      const modelA = defineModel({
        name: 'modelA',
        state: {
          a: 0,
        },
        reducers: {
          changeA(state) {
            return {
              a: state.a + 1,
            }
          },
        },
        views: {
          doubleA() {
            return this.a * 2
          },
        },
      })
      const sample = defineModel(
        {
          name: 'sample',
          state: {},
          reducers: {},
          views: {
            viewA() {
              return this.$dep.modelA.doubleA
            },
          },
        },
        [modelA]
      )
      const store = redoxStore.getModel(sample)
      const storeA = redoxStore.getModel(modelA)
      expect(store.viewA).toBe(0)
      storeA.changeA()
      expect(storeA.doubleA).toBe(2)
      expect(store.viewA).toBe(2)
    })
  })

  describe('primitive state/simple value', () => {
    it("should not be invoked when deps don't change", () => {
      let numberOfCalls = 0
      const numberModel = defineModel({
        name: 'numberModel',
        state: 0,
        reducers: {
          doNothing: (_) => {},
        },
        views: {
          getState() {
            numberOfCalls++
            return this.$state
          },
        },
      })

      const numberStore = redoxStore.getModel(numberModel)

      let valueFromViews

      expect(numberOfCalls).toBe(0)
      valueFromViews = numberStore.getState
      expect(numberOfCalls).toBe(1)
      expect(valueFromViews).toBe(0)

      numberStore.doNothing()
      valueFromViews = numberStore.getState
      expect(numberOfCalls).toBe(1)
      expect(valueFromViews).toBe(0)
    })

    it('should return last value', () => {
      let numberOfCalls = 0
      const numberModel = defineModel({
        name: 'numberModel',
        state: 0,
        reducers: {
          increment: (state) => {
            return ++state
          },
        },
        views: {
          getState() {
            numberOfCalls++
            return this.$state
          },
        },
      })

      const numberStore = redoxStore.getModel(numberModel)

      let valueFromViews

      expect(numberOfCalls).toBe(0)
      valueFromViews = numberStore.getState
      expect(numberOfCalls).toBe(1)
      expect(valueFromViews).toBe(0)

      numberStore.increment()
      valueFromViews = numberStore.getState
      expect(numberOfCalls).toBe(2)
      expect(valueFromViews).toBe(1)
    })
  })

  describe('primitive state/array', () => {
    it("should not be invoked when deps don't change", () => {
      let numberOfCalls = 0

      const arrayModel = defineModel({
        name: 'arrayModel',
        state: [0, 1],
        reducers: {
          doNothing: (state) => {
            return state
          },
        },
        views: {
          getArr() {
            numberOfCalls++
            return this.$state
          },
        },
      })

      const arrayStore = redoxStore.getModel(arrayModel)

      let valueFromViews

      expect(numberOfCalls).toBe(0)
      valueFromViews = arrayStore.getArr
      expect(numberOfCalls).toBe(1)
      expect(valueFromViews).toEqual(arrayModel.state)

      arrayStore.doNothing()
      valueFromViews = arrayStore.getArr
      expect(numberOfCalls).toBe(1)
      expect(valueFromViews).toEqual(arrayModel.state)
    })

    it('should return last value', () => {
      let numberOfCalls = 0

      const arrayModel = defineModel({
        name: 'arrayModel',
        state: [0],
        reducers: {
          remove: (state, payload: number) => {
            state.splice(payload, 1)
            return state
          },
          append: (state, payload: any) => {
            state.push(payload)
            return state
          },
        },
        views: {
          getState() {
            numberOfCalls++
            return this.$state
          },
        },
      })

      const arrayStore = redoxStore.getModel(arrayModel)

      let valueFromViews

      expect(numberOfCalls).toBe(0)
      valueFromViews = arrayStore.getState
      expect(numberOfCalls).toBe(1)
      expect(valueFromViews).toEqual([0])

      arrayStore.append(1)
      valueFromViews = arrayStore.getState
      expect(numberOfCalls).toBe(2)
      expect(valueFromViews).toEqual([0, 1])
    })
  })
})

describe('createSelector', () => {
  it('should throw error if changed state in a view', () => {
    const model = defineModel({
      name: 'model',
      state: {
        a: 1,
      },
      views: {
        view() {
          const state = this.$state
          state.a = 1
          return this.$state
        },
      },
    })

    const store = redoxStore.getModel(model)
    const view = store.$createSelector(function (stateAndViews) {
      stateAndViews.a = 1
      return 1
    })

    expect(() => {
      view()
    }).toThrow()
    expect('Cannot change state in view function').toHaveBeenWarned()
  })

  it('$state and any view should be object', () => {
    const model = defineModel({
      name: 'modal',
      state: {
        a: {},
      },
      reducers: {},
      views: {
        anyView() {
          return this.a
        },
      },
    })

    const store = redoxStore.getModel(model)

    const selector = function (stateAndViews: ModelSnapshot<typeof model>) {
      return stateAndViews
    }

    const view = store.$createSelector(selector)
    const stateAndViews = view()

    expect(typeof stateAndViews.$state).toBe('object')
    expect(typeof stateAndViews.anyView).toBe('object')
  })

  it('should return same reference if no update', () => {
    const sample = defineModel({
      name: 'sample',
      state: {
        a: { foo: 'bar' },
        b: 1,
      },
      reducers: {
        changeB(state) {
          return {
            ...state,
            b: state.b + 1,
          }
        },
      },
      views: {
        viewA() {
          void this.a
          return {}
        },
      },
    })

    const selector = function (stateAndViews: ModelSnapshot<typeof sample>) {
      return stateAndViews.viewA
    }

    const store = redoxStore.getModel(sample)
    const view = store.$createSelector(selector)
    const value = view()
    store.changeB()

    expect(view()).toBe(value)
  })

  it('should always return same reference if no depends', () => {
    const sample = defineModel({
      name: 'sample',
      state: {
        a: { foo: 'bar' },
        b: 1,
      },
      reducers: {
        changeA(state) {
          return {
            ...state,
            a: { foo: 'foo' },
          }
        },
        changeB(state) {
          return {
            ...state,
            b: state.b + 1,
          }
        },
      },
    })

    const selector = function (stateAndViews: ModelSnapshot<typeof sample>) {
      return {}
    }

    const store = redoxStore.getModel(sample)
    const view = store.$createSelector(selector)
    const value = view()

    store.changeB()
    store.changeA()
    expect(view()).toBe(value)
  })

  test("should not be invoked when deps don't change (this.$state())", () => {
    let calltime = 0
    const model = defineModel({
      name: 'model',
      state: {
        foo: 'bar',
      },
      reducers: {
        changeValue: (state) => {
          state.foo = 'zoo'
        },
      },
    })

    const selector = function (stateAndViews: ModelSnapshot<typeof model>) {
      calltime++
      return stateAndViews.$state.foo
    }

    const store = redoxStore.getModel(model)
    const view = store.$createSelector(selector)

    let value: string

    expect(calltime).toBe(0)
    value = view()
    value = view()
    expect(calltime).toBe(1)
    expect(value).toEqual('bar')

    store.changeValue()
    value = view()
    expect(calltime).toBe(2)
    expect(value).toEqual('zoo')
  })

  test("should not be invoked when deps don't change (view)", () => {
    let calltime = 0
    const model = defineModel({
      name: 'model',
      state: {
        foo: 'bar',
      },
      reducers: {
        changeValue: (state) => {
          state.foo = 'zoo'
        },
      },
      views: {
        getFoo() {
          return this.foo
        },
      },
    })

    const selector = function (stateAndViews: ModelSnapshot<typeof model>) {
      calltime++
      return stateAndViews.getFoo
    }

    const store = redoxStore.getModel(model)
    const view = store.$createSelector(selector)

    let value: string

    expect(calltime).toBe(0)
    value = view()
    value = view()
    expect(calltime).toBe(1)
    expect(value).toEqual('bar')

    store.changeValue()
    value = view()
    expect(calltime).toBe(2)
    expect(value).toEqual('zoo')
  })

  describe('primitive state/simple value', () => {
    it("should not be invoked when deps don't change", () => {
      let numberOfCalls = 0
      const numberModel = defineModel({
        name: 'numberModel',
        state: 0,
        reducers: {
          doNothing: (_) => {},
        },
      })

      const selector = function (
        stateAndViews: ModelSnapshot<typeof numberModel>
      ) {
        numberOfCalls++
        return stateAndViews.$state
      }

      const numberStore = redoxStore.getModel(numberModel)
      const view = numberStore.$createSelector(selector)

      let valueFromViews

      expect(numberOfCalls).toBe(0)
      valueFromViews = view()
      expect(numberOfCalls).toBe(1)
      expect(valueFromViews).toBe(0)

      numberStore.doNothing()
      valueFromViews = view()
      expect(numberOfCalls).toBe(1)
      expect(valueFromViews).toBe(0)
    })

    it('should return last value', () => {
      let numberOfCalls = 0
      const numberModel = defineModel({
        name: 'numberModel',
        state: 0,
        reducers: {
          increment: (state) => {
            return ++state
          },
        },
      })

      const selector = function (
        stateAndViews: ModelSnapshot<typeof numberModel>
      ) {
        numberOfCalls++
        return stateAndViews.$state
      }

      const numberStore = redoxStore.getModel(numberModel)
      const view = numberStore.$createSelector(selector)
      let valueFromViews

      expect(numberOfCalls).toBe(0)
      valueFromViews = view()
      expect(numberOfCalls).toBe(1)
      expect(valueFromViews).toBe(0)

      numberStore.increment()
      valueFromViews = view()
      expect(numberOfCalls).toBe(2)
      expect(valueFromViews).toBe(1)
    })
  })

  describe('primitive state/array', () => {
    it("should not be invoked when deps don't change", () => {
      let numberOfCalls = 0

      const arrayModel = defineModel({
        name: 'arrayModel',
        state: [0, 1],
        reducers: {
          doNothing: (state) => {
            return state
          },
        },
      })

      const selector = function (
        stateAndViews: ModelSnapshot<typeof arrayModel>
      ) {
        numberOfCalls++
        return stateAndViews.$state[0]
      }

      const arrayStore = redoxStore.getModel(arrayModel)
      const view = arrayStore.$createSelector(selector)

      let valueFromViews

      expect(numberOfCalls).toBe(0)
      valueFromViews = view()
      expect(numberOfCalls).toBe(1)
      expect(valueFromViews).toEqual(0)

      arrayStore.doNothing()
      valueFromViews = view()
      expect(numberOfCalls).toBe(1)
      expect(valueFromViews).toEqual(0)
    })

    it('should return last value', () => {
      let numberOfCalls = 0

      const arrayModel = defineModel({
        name: 'arrayModel',
        state: [0],
        reducers: {
          remove: (state, payload: number) => {
            state.splice(payload, 1)
            return state
          },
          append: (state, payload: any) => {
            state.push(payload)
            return state
          },
        },
      })

      const selector = function (
        stateAndViews: ModelSnapshot<typeof arrayModel>
      ) {
        numberOfCalls++
        return stateAndViews.$state
      }

      const arrayStore = redoxStore.getModel(arrayModel)
      const view = arrayStore.$createSelector(selector)

      let valueFromViews

      expect(numberOfCalls).toBe(0)
      valueFromViews = view()
      expect(numberOfCalls).toBe(1)
      expect(valueFromViews).toEqual([0])

      arrayStore.append(1)
      valueFromViews = view()
      expect(numberOfCalls).toBe(2)
      expect(valueFromViews).toEqual([0, 1])
    })
  })
})
