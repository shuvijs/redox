import { reactive } from '../reactive'
import { view } from '../view'
import { effect } from '../effect'
import { produce } from '../producer'

describe('reactivity/view', () => {
  it('should return updated value', () => {
    const store: any = {
      state: {},
    }
    store.$state = reactive<{ foo?: number }>(store.state)
    const cValue = view(() => store.$state.foo)
    expect(cValue.value).toBe(undefined)
    store.state = produce(store.$state, (draft) => {
      draft.foo = 1
    })
    store.$state = reactive<{ foo?: number }>(store.state)
    expect(cValue.value).toBe(1)
  })

  it('should compute lazily', () => {
    const store: any = {
      state: {},
    }
    store.$state = reactive<{ foo?: number }>(store.state)
    const getter = jest.fn(() => store.$state.foo)
    const cValue = view(getter)

    // lazy
    expect(getter).not.toHaveBeenCalled()

    expect(cValue.value).toBe(undefined)
    expect(getter).toHaveBeenCalledTimes(1)

    // should not compute again
    cValue.value
    expect(getter).toHaveBeenCalledTimes(1)

    // should not compute until needed
    store.state = produce(store.$state, (draft) => {
      draft.foo = 1
    })
    store.$state = reactive<{ foo?: number }>(store.state)
    expect(getter).toHaveBeenCalledTimes(1)

    // now it should compute
    expect(cValue.value).toBe(1)
    expect(getter).toHaveBeenCalledTimes(2)

    // should not compute again
    cValue.value
    expect(getter).toHaveBeenCalledTimes(2)
  })

  it('should trigger effect', () => {
    const store: any = {
      state: {},
    }
    store.$state = reactive<{ foo?: number }>(store.state)
    const cValue = view(() => store.$state.foo)
    let fn = jest.fn()
    effect(() => {
      cValue.value
      fn()
    })
    expect(fn).toHaveBeenCalledTimes(1)
    store.state = produce(store.$state, (draft) => {
      draft.foo++
    })
    expect(fn).toHaveBeenCalledTimes(2)
    store.$state = reactive<{ foo?: number }>(store.state)
  })

  it('should work when chained', () => {
    const store: any = {
      state: { foo: 0 },
    }
    store.$state = reactive(store.state)
    const c1 = view(() => store.$state.foo)
    const c2 = view(() => c1.value + 1)
    expect(c2.value).toBe(1)
    expect(c1.value).toBe(0)
    store.state = produce(store.$state, (draft) => {
      draft.foo++
    })
    store.$state = reactive(store.state)
    expect(c2.value).toBe(2)
    expect(c1.value).toBe(1)
  })

  it('should trigger effect when chained (mixed invocations)', () => {
    const store: any = {
      state: { foo: 0 },
    }
    store.$state = reactive(store.state)
    const getter1 = jest.fn(() => store.$state.foo)
    const getter2 = jest.fn(() => {
      return c1.value + 1
    })
    const c1 = view(getter1)
    const c2 = view(getter2)

    let fn = jest.fn()
    effect(() => {
      c1.value + c2.value
      fn()
    })

    expect(fn).toHaveBeenCalledTimes(1)
    expect(getter1).toHaveBeenCalledTimes(1)
    expect(getter2).toHaveBeenCalledTimes(1)
    store.state = produce(store.$state, (draft) => {
      draft.foo++
    })
    store.$state = reactive(store.state)
    expect(fn).toHaveBeenCalledTimes(3)

    // should not result in duplicate calls
    expect(getter1).toHaveBeenCalledTimes(2)
    expect(getter2).toHaveBeenCalledTimes(2)
  })

  it('should no longer update when stopped', () => {
    const store: any = {
      state: {},
    }
    store.$state = reactive<{ foo?: number }>(store.state)
    const cValue = view(() => store.$state.foo)
    let fn = jest.fn()
    effect(() => {
      cValue.value
      fn()
    })
    expect(fn).toHaveBeenCalledTimes(1)
    store.state = produce(store.$state, (draft) => {
      draft.foo = 1
    })
    store.$state = reactive(store.state)
    expect(fn).toHaveBeenCalledTimes(2)
    cValue.effect.stop()
    store.state = produce(store.$state, (draft) => {
      draft.foo = 2
    })
    store.$state = reactive(store.state)
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should expose value when stopped', () => {
    const x = view(() => 1)
    x.effect.stop()
    expect(x.value).toBe(1)
  })
})
