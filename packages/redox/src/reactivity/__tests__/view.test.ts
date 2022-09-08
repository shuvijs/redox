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

  it("should not be invoked when deps ref don't change", () => {
    const fn = jest.fn()
    const obj = {
      foo: 'bar',
    }
    const store: any = {
      state: {
        a: obj,
      },
    }
    let $state = reactive(() => store.state)
    const viewFn = function (this: any) {
      this.a.foo
      return {}
    }
    const double = view(() => {
      fn()
      return viewFn.call($state)
    })

    const value = double.value
    expect(fn).toHaveBeenCalledTimes(1)

    store.state = {
      a: obj,
    }
    $state = reactive(() => store.state)

    expect(double.value).toBe(value)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  // FIXME
  it.skip("should not be invoked when deps ref don't change (object with same referrence)", () => {
    const fn = jest.fn()
    const obj = { foo: 1, bar: 2 }
    const store: any = {
      state: {
        a: obj,
        b: obj,
      },
    }
    store.$state = reactive(() => store.state)
    const sum = view(() => {
      fn()
      return store.$state.a.foo + store.$state.b.bar
    })
    expect(sum.value).toBe(3)
    expect(fn).toHaveBeenCalledTimes(1)

    store.state = { a: { foo: 1, bar: 3 }, b: { foo: 3, bar: 2 } }
    store.$state = reactive(() => store.state)

    // should return cached value
    expect(sum.value).toBe(3)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should be invoked when deps ref change', () => {
    const fn = jest.fn()
    const store: any = {
      state: {
        a: {
          foo: 'bar',
        },
      },
    }
    let $state = reactive(() => store.state)
    const viewFn = function (this: any) {
      const a = this.a
      void this.a.foo
      return a
    }
    const double = view(() => {
      fn()
      return viewFn.call($state)
    })

    const value = double.value
    expect(fn).toHaveBeenCalledTimes(1)

    store.state = {
      a: {
        foo: 'bar',
      },
    }
    $state = reactive(() => store.state)
    expect(double.value === value).toBeFalsy()
    expect(fn).toHaveBeenCalledTimes(2)
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

  it('should return the last value for none existed property', () => {
    const fn = jest.fn()
    const store: any = {
      state: {},
    }
    store.$state = reactive(() => store.state)
    const num = view(() => {
      fn()
      return store.$state.num
    })
    expect(num.value).toBeUndefined()
    expect(fn).toHaveBeenCalledTimes(1)

    store.state = { num: 1 }
    store.$state = reactive(store.state)

    // re-calculate
    expect(num.value).toBe(1)
    // cache
    expect(num.value).toBe(1)
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

  // FIXME: tracked other viewed result, can‘t find sample way to disabled tracked other viewed result, fix it in future
  // it('should not tracked other view result', () => {
  //   const store: any = {
  //     state: {
  //       a: {
  //         b: {
  //           c: 'c',
  //         },
  //       },
  //     },
  //   }
  //   store.$state = reactive(() => store.state)
  //   const objB = view(() => {
  //     return store.$state.a.b
  //   })
  //   const objC = view(() => {
  //     // @ts-ignore
  //     return objB.value.c
  //   })
  //   objC.value
  //   expect(objC.effect.targetMap.size).toBe(0)
  //   expect(objC.effect.views.size).toBe(1)
  // })

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
