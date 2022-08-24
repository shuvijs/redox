import { defineModel, redox } from '../'

let redoxStore: ReturnType<typeof redox>

beforeEach(() => {
  redoxStore = redox()
})

describe('defineModel/reducers', () => {
  it('should change the state"', () => {
    const count = defineModel({
      name: 'count',
      state: { value: 0 },
      reducers: {
        add: (state) => ({
          value: state.value + 1,
        }),
        sub: (state) => ({
          value: state.value - 1,
        }),
      },
    })

    const store = redoxStore.getModel(count)

    store.add()
    expect(store.$state).toEqual({ value: 1 })

    store.sub()
    expect(store.$state).toEqual({ value: 0 })
  })

  it('should return an action', () => {
    const count = defineModel({
      name: 'count',
      state: { value: 0 },
      reducers: {
        add: (state) => ({
          value: state.value + 1,
        }),
      },
    })

    const store = redoxStore.getModel(count)

    const dispatched = store.add()

    expect(store.$state).toEqual({ value: 1 })
    expect(dispatched).toEqual({ type: 'add' })
  })

  it('should receive the state', () => {
    const count = defineModel({
      name: 'count',
      state: { value: 0 },
      reducers: {
        plusOne: (state) => ({
          ...state,
          value: state.value + 1,
        }),
      },
    })

    const store = redoxStore.getModel(count)

    store.plusOne()

    expect(store.$state).toEqual({ value: 1 })
  })

  it('should recieve the payload', () => {
    const count = defineModel({
      name: 'a',
      state: {
        value: '',
      },
      reducers: {
        set: (_, payload: any) => ({
          value: payload,
        }),
      },
    })

    const store = redoxStore.getModel(count)

    store.set(false)
    expect(store.$state).toEqual({ value: false })

    store.set(null)
    expect(store.$state).toEqual({ value: null })

    store.set(0)
    expect(store.$state).toEqual({ value: 0 })

    let obj = { foo: 'bar' }
    store.set(obj)
    expect(store.$state.value).toEqual(obj)
  })

  describe('immer', () => {
    it('should work with a basic literal', () => {
      const count = defineModel({
        name: 'count',
        state: { value: 0 },
        reducers: {
          add(state) {
            state.value = state.value + 1
          },
        },
      })

      const store = redoxStore.getModel(count)

      store.add()

      expect(store.$state).toEqual({ value: 1 })
    })

    it('should with a nullable basic literal', () => {
      const model = defineModel({
        name: 'model',
        state: { value: null } as { value: number | null },
        reducers: {
          set(state, payload: number) {
            state.value = payload
          },
        },
      })

      const store = redoxStore.getModel(model)

      store.set(1)

      expect(store.$state).toEqual({ value: 1 })
    })

    it('should work with a object', () => {
      const todo = [
        {
          todo: 'Learn typescript',
          done: true,
        },
        {
          todo: 'Try immer',
          done: false,
        },
      ]
      const todoModel = defineModel({
        name: 'todo',
        state: {
          value: todo,
        },
        reducers: {
          done(state) {
            state.value.push({ todo: 'Tweet about it', done: false })
            state.value[1].done = true
          },
        },
      })

      const store = redoxStore.getModel(todoModel)

      store.done()
      const newState = store.$state

      expect(todo.length).toBe(2)
      expect(newState.value).toHaveLength(3)

      expect(todo[1].done).toBe(false)
      expect(newState.value[1].done).toEqual(true)
    })

    it('should not modify draft and return new state at the same time', () => {
      const model = defineModel({
        name: 'model',
        state: { value: null } as { value: number | null },
        reducers: {
          set(state, payload: number) {
            state.value = payload
            return { foo: 'bar' } as any
          },
        },
      })

      const store = redoxStore.getModel(model)

      expect(() => store.set(1)).toThrow()

      expect(store.$state).toEqual({ value: null })
    })
  })
})
