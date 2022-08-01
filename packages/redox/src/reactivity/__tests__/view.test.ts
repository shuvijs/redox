import { reactive } from '../reactive'
import { view } from '../view'

describe('reactivity/view', () => {
  it('should return cached value', () => {
    const fn = jest.fn()
    const store: any = {
      state: {
        num: 1,
      },
    }
    store.$state = reactive(() => store.state)
    const double = view(() => {
      fn()
      return store.$state.num * 2
    })
    expect(double.value).toBe(2)
    expect(double.value).toBe(2)

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should return the last value', () => {
    const fn = jest.fn()
    const store: any = {
      state: {
        num: 1,
      },
    }
    store.$state = reactive(() => store.state)
    const double = view(() => {
      fn()
      return store.$state.num * 2
    })
    expect(double.value).toBe(2)
    expect(fn).toHaveBeenCalledTimes(1)

    store.state = { num: 2 }
    store.$state = reactive(store.state)

    // re-calculate
    expect(double.value).toBe(4)
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should reactive to other view', () => {
    const fn1 = jest.fn()
    const fn2 = jest.fn()
    const store: any = {
      state: {
        num: 1,
      },
    }
    store.$state = reactive(() => store.state)
    const double = view(() => {
      fn1()
      return store.$state.num * 2
    })
    const triple = view(() => {
      fn2()
      return double.value + 1
    })
    expect(double.value).toBe(2)
    expect(triple.value).toBe(3)
    expect(fn1).toHaveBeenCalledTimes(1)
    expect(fn2).toHaveBeenCalledTimes(1)

    store.state = { num: 2 }
    store.$state = reactive(() => store.state)

    // re-calculate
    expect(double.value).toBe(4)
    expect(triple.value).toBe(5)
    expect(fn1).toHaveBeenCalledTimes(2)
    expect(fn2).toHaveBeenCalledTimes(2)

    // cached
    expect(triple.value).toBe(5)
    expect(fn2).toHaveBeenCalledTimes(2)
  })

  it('should support multiple reactive objects', () => {
    const fn = jest.fn()
    const store: any = {
      state: {
        num: 1,
      },
    }
    const store1 = {
      state: {
        num: 1,
      },
    }
    const store2 = {
      state: {
        num: 1,
      },
    }
    store.$state = reactive(() => store.state)
    store.$others = {
      a: reactive(() => store1.state),
      b: reactive(() => store2.state),
    }

    const sum = view(() => {
      fn()
      return store.$state.num + store.$others.a.num + store.$others.b.num
    })
    expect(sum.value).toBe(3)
    expect(fn).toHaveBeenCalledTimes(1)

    store.state = { num: 2 }
    store1.state = { num: 3 }
    store2.state = { num: 4 }
    store.$state = reactive(() => store.state)
    store.$others = {
      a: reactive(() => store1.state),
      b: reactive(() => store2.state),
    }

    // re-calculate
    expect(sum.value).toBe(9)
    expect(fn).toHaveBeenCalledTimes(2)

    // cached
    expect(sum.value).toBe(9)
    expect(fn).toHaveBeenCalledTimes(2)
  })
})
