import { defineModel, redox } from '../src/index'

let redoxStore: ReturnType<typeof redox>

beforeEach(() => {
  redoxStore = redox()
  process.env.NODE_ENV = 'development'
})

describe('defineModel', () => {
  describe('type checking', () => {
    test('model is necessary', () => {
      expect(() => {
        // @ts-ignore
        const modelA = defineModel()
      }).toThrow()
    })

    test('name is not necessary', () => {
      expect(() => {
        defineModel(
          // @ts-ignore
          {
            state: {},
          }
        )
      }).not.toThrow()
    })

    test('state is necessary', () => {
      expect(() => {
        defineModel(
          // @ts-ignore
          {
            name: 'a',
          }
        )
      }).toThrow()
    })

    test('state could be a number', () => {
      expect(() => {
        defineModel({
          name: 'a',
          state: 1,
        })
      }).not.toThrow()
    })

    test('state could be a string', () => {
      expect(() => {
        defineModel({
          name: 'a',
          state: 'test',
        })
      }).not.toThrow()
    })

    test('state could be a array', () => {
      expect(() => {
        defineModel({
          name: 'a',
          state: [],
        })
      }).not.toThrow()
    })

    test('state could be a boolean', () => {
      expect(() => {
        defineModel({
          name: 'a',
          state: false,
        })
      }).not.toThrow()
    })

    test('state could be a undefined', () => {
      expect(() => {
        defineModel({
          name: 'a',
          state: undefined,
        })
      }).not.toThrow()
    })

    test('state could be a null', () => {
      expect(() => {
        defineModel({
          name: 'a',
          state: null,
        })
      }).not.toThrow()
    })

    test('state could not be a bigint', () => {
      expect(() => {
        defineModel({
          name: 'a',
          // @ts-ignore
          state: BigInt(1),
        })
      }).toThrow()
    })

    test('state could not be a symbol', () => {
      expect(() => {
        defineModel({
          name: 'a',
          // @ts-ignore
          state: Symbol('1'),
        })
      }).toThrow()
    })

    test('reducers should be object', () => {
      expect(() => {
        defineModel({
          name: 'a',
          state: {},
          // @ts-ignore
          reducers: 1,
        })
      }).toThrow()
    })

    test('reducer should be function', () => {
      expect(() => {
        defineModel({
          name: 'a',
          state: {},
          reducers: {
            // @ts-ignore
            1: 1,
          },
        })
      }).toThrow()
    })

    test('actions should be object', () => {
      expect(() => {
        defineModel({
          name: 'a',
          state: {},
          // @ts-ignore
          actions: 1,
        })
      }).toThrow()
    })

    test('action should be function', () => {
      expect(() => {
        defineModel({
          name: 'a',
          state: {},
          actions: {
            // @ts-ignore
            1: 1,
          },
        })
      }).toThrow()
    })

    test('views should be object', () => {
      expect(() => {
        defineModel({
          name: 'a',
          state: {},
          // @ts-ignore
          views: 1,
        })
      }).toThrow()
    })

    test('view should be function', () => {
      expect(() => {
        defineModel({
          name: 'a',
          state: {},
          views: {
            // @ts-ignore
            1: 1,
          },
        })
      }).toThrow()
    })

    test('not allow repeat key state views', () => {
      expect(() => {
        defineModel({
          name: 'a',
          state: {
            a: 0,
          },
          views: {
            a() {},
          },
        })
      }).toThrow()
    })

    test('not allow repeat key reducers actions views', () => {
      expect(() => {
        defineModel({
          name: 'a',
          state: {},
          reducers: {
            a() {},
          },
          actions: {
            a() {},
          },
        })
      }).toThrow()
    })

    test('depends should be array or undefined', () => {
      expect(() => {
        defineModel(
          {
            name: 'a',
            state: {},
            reducers: {},
          },
          // @ts-ignore
          {}
        )
      }).toThrow()

      expect(() => {
        defineModel({
          name: 'a',
          state: {},
        })
        defineModel(
          {
            name: 'a',
            state: {},
          },
          []
        )
      }).not.toThrow()
    })
  })

  it('should return the model', () => {
    const model = {
      name: 'a',
      state: {},
      reducers: {},
    }

    const modelA = defineModel(model)

    expect(model).toBe(modelA)
  })

  describe('dependencies', () => {
    it('should access dependent models by this.$dep', () => {
      let deps: any
      const depOne = defineModel({
        name: 'one',
        state: { count: 0 },
        reducers: {
          add: (s, p: number) => ({
            count: s.count + p,
          }),
        },
        actions: {
          actionAdd(n: number) {
            this.add(n)
          },
        },
      })

      const depTwo = defineModel({
        name: 'two',
        state: { count: 0 },
        reducers: {
          add: (s, p: number) => ({
            count: s.count + p,
          }),
        },
      })

      const model = defineModel(
        {
          name: 'model',
          state: { value: 0 },
          reducers: {
            add: (s, p: number) => ({ value: s.value + p }),
          },
          actions: {
            addByReducer(_: void) {
              deps = this.$dep
              this.$dep.one.add(1)
              this.$dep.two.add(1)
              this.add(1)
            },
            addByAction(_: void) {
              this.$dep.one.actionAdd(1)
            },
          },
        },
        [depOne, depTwo]
      )

      const depOneStore = redoxStore.getModel(depOne)
      const depTwoStore = redoxStore.getModel(depTwo)
      const store = redoxStore.getModel(model)

      store.addByReducer()
      expect(store.$state).toEqual({ value: 1 })
      expect(depOneStore.$state).toEqual({ count: 1 })
      expect(depTwoStore.$state).toEqual({ count: 1 })

      // expect(deps.one).toBe(depOneStore)
      // expect(deps.two).toBe(depTwoStore)

      store.addByAction()
      expect(depOneStore.$state).toEqual({ count: 2 })
      expect(depTwoStore.$state).toEqual({ count: 1 })
    })

    it("should reactive to dep's view", async () => {
      const dep = defineModel({
        name: 'dep',
        state: { count: 1 },
        reducers: {
          add: (s, p: number) => ({
            count: s.count + p,
          }),
        },
        views: {
          double() {
            return this.count * 2
          },
        },
      })

      const model = defineModel(
        {
          name: 'model',
          state: { value: 0 },
          reducers: {
            add: (s, p: number) => ({
              value: s.value + p,
            }),
          },
          views: {
            all() {
              return {
                value: this.value,
                depDouble: this.$dep.dep.double,
              }
            },
          },
        },
        [dep]
      )

      const store = redoxStore.getModel(model)
      const depStore = redoxStore.getModel(dep)

      let v = store.all
      expect(v).toEqual({
        value: 0,
        depDouble: 2,
      })
      expect(store.all).toBe(v)

      depStore.add(1)
      v = store.all
      expect(v).toEqual({
        value: 0,
        depDouble: 4,
      })
      expect(store.all).toBe(v)

      store.add(1)
      v = store.all
      expect(v).toEqual({
        value: 1,
        depDouble: 4,
      })
      expect(store.all).toBe(v)
    })
  })
})
