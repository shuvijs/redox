// @ts-nocheck
import { ReactiveFlags, toRaw, reactive } from '../reactive'
import { produce } from '../producer'
import { isObject, shallowCopy } from '../../utils'

import cloneDeep from 'lodash.clonedeep'
import * as lodash from 'lodash'

jest.setTimeout(1000)

function each(obj: any, iter: any, enumerableOnly = false) {
  if (isObject(obj)) {
    ;(enumerableOnly ? Object.keys : Reflect.ownKeys)(obj).forEach((key) => {
      if (!enumerableOnly || typeof key !== 'symbol') iter(key, obj[key], obj)
    })
  } else {
    obj.forEach((entry: any, index: any) => iter(index, entry, obj))
  }
}

const immerable: unique symbol = Symbol.for('immer-draftable')

const isDraft = (target: any) => target[ReactiveFlags.IS_REACTIVE]
const original = toRaw

const isProd = process.env.NODE_ENV === 'production'

const useProxies = true
const autoFreeze = false

describe(`reactivity/producer`, () => {
  describe(`base functionality`, () => {
    let baseState
    let origBaseState

    class Foo {}
    function createBaseState() {
      const data = {
        anInstance: new Foo(),
        anArray: [3, 2, { c: 3 }, 1],
        aMap: new Map([
          ['jedi', { name: 'Luke', skill: 10 }],
          ['jediTotal', 42],
          ['force', "these aren't the droids you're looking for"],
        ]),
        aSet: new Set([
          'Luke',
          42,
          {
            jedi: 'Yoda',
          },
        ]),
        aProp: 'hi',
        anObject: {
          nested: {
            yummie: true,
          },
          coffee: false,
        },
      }
      return data
    }

    beforeEach(() => {
      origBaseState = baseState = createBaseState()
    })

    it('second argument should be a function', () => {
      const originNodeEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      produce(reactive(baseState), undefined)
      expect(`recipe should be function`).toHaveBeenWarned()
      process.env.NODE_ENV = originNodeEnv
    })

    it('returns the original state when no changes are made', () => {
      const nextState = produce(reactive(baseState), (s) => {
        expect(s.aProp).toBe('hi')
        expect(s.anObject.nested).toMatchObject({ yummie: true })
      })
      expect(nextState).toBe(baseState)
    })

    it('does structural sharing', () => {
      const random = Math.random()
      const nextState = produce(reactive(baseState), (s) => {
        s.aProp = random
      })
      expect(nextState).not.toBe(baseState)
      expect(nextState.aProp).toBe(random)
      expect(nextState.nested).toBe(baseState.nested)
    })

    it('deep change bubbles up', () => {
      const nextState = produce(reactive(baseState), (s) => {
        s.anObject.nested.yummie = false
      })
      expect(nextState).not.toBe(baseState)
      expect(nextState.anObject).not.toBe(baseState.anObject)
      expect(baseState.anObject.nested.yummie).toBe(true)
      expect(nextState.anObject.nested.yummie).toBe(false)
      expect(nextState.anArray).toBe(baseState.anArray)
    })

    it('can add props', () => {
      const nextState = produce(reactive(baseState), (s) => {
        s.anObject.cookie = { tasty: true }
      })
      expect(nextState).not.toBe(baseState)
      expect(nextState.anObject).not.toBe(baseState.anObject)
      expect(nextState.anObject.nested).toBe(baseState.anObject.nested)
      expect(nextState.anObject.cookie).toEqual({ tasty: true })
    })

    it('can delete props', () => {
      const nextState = produce(reactive(baseState), (s) => {
        delete s.anObject.nested
      })
      expect(nextState).not.toBe(baseState)
      expect(nextState.anObject).not.toBe(baseState.anObject)
      expect(nextState.anObject.nested).toBe(undefined)
    })

    // Found by: https://github.com/mweststrate/immer/pull/267
    it('can delete props added in the producer', () => {
      const nextState = produce(reactive(baseState), (s) => {
        s.anObject.test = true
        delete s.anObject.test
      })
      if (useProxies) {
        expect(nextState).not.toBe(baseState)
        expect(nextState).toEqual(baseState)
      } else {
        // The copy is avoided in ES5.
        expect(nextState).toBe(baseState)
      }
    })

    // Found by: https://github.com/mweststrate/immer/issues/328
    it('can set a property that was just deleted', () => {
      const baseState = { a: 1 }
      const nextState = produce(reactive(baseState), (s) => {
        delete s.a
        s.a = 2
      })
      expect(nextState.a).toBe(2)
    })

    it('can set a property to its original value after deleting it', () => {
      const baseState = { a: { b: 1 } }
      const nextState = produce(reactive(baseState), (s) => {
        const a = s.a
        delete s.a
        s.a = a
      })
      if (useProxies) {
        expect(nextState).not.toBe(baseState)
        expect(nextState).toEqual(baseState)
      } else {
        // The copy is avoided in ES5.
        expect(nextState).toBe(baseState)
      }
    })

    it('can get property descriptors', () => {
      const getDescriptor = Object.getOwnPropertyDescriptor
      const baseState = [{ a: 1 }]
      produce(reactive(baseState), (arr) => {
        const obj = arr[0]
        const desc = {
          configurable: true,
          enumerable: true,
          ...(useProxies && { writable: true }),
        }

        // Known property
        expect(getDescriptor(obj, 'a')).toMatchObject(desc)
        expect(getDescriptor(arr, 0)).toMatchObject(desc)

        // Deleted property
        delete obj.a
        arr.pop()
        expect(getDescriptor(obj, 'a')).toBeUndefined()
        expect(getDescriptor(arr, 0)).toBeUndefined()

        // Unknown property
        expect(getDescriptor(obj, 'b')).toBeUndefined()
        expect(getDescriptor(arr, 100)).toBeUndefined()

        // Added property
        obj.b = 2
        arr[100] = 1
        expect(getDescriptor(obj, 'b')).toBeDefined()
        expect(getDescriptor(arr, 100)).toBeDefined()
      })
    })

    describe('array drafts', () => {
      it('supports Array.isArray()', () => {
        const nextState = produce(reactive(baseState), (s) => {
          expect(Array.isArray(s.anArray)).toBeTruthy()
          s.anArray.push(1)
        })
        expect(Array.isArray(nextState.anArray)).toBeTruthy()
      })

      it('supports index access', () => {
        const value = baseState.anArray[0]
        const nextState = produce(reactive(baseState), (s) => {
          expect(s.anArray[0]).toBe(value)
        })
        expect(nextState).toBe(baseState)
      })

      it('supports iteration', () => {
        const base = [
          { id: 1, a: 1 },
          { id: 2, a: 1 },
        ]
        const findById = (collection, id) => {
          for (const item of collection) {
            if (item.id === id) return item
          }
          return null
        }
        const result = produce(reactive(base), (draft) => {
          const obj1 = findById(draft, 1)
          const obj2 = findById(draft, 2)
          obj1.a = 2
          obj2.a = 2
        })
        expect(result[0].a).toEqual(2)
        expect(result[1].a).toEqual(2)
      })

      it('can assign an index via bracket notation', () => {
        const nextState = produce(reactive(baseState), (s) => {
          s.anArray[3] = true
        })
        expect(nextState).not.toBe(baseState)
        expect(nextState.anArray).not.toBe(baseState.anArray)
        expect(nextState.anArray[3]).toEqual(true)
      })

      it('can use splice() to both add and remove items', () => {
        const nextState = produce(reactive(baseState), (s) => {
          s.anArray.splice(1, 1, 'a', 'b')
        })
        expect(nextState.anArray).not.toBe(baseState.anArray)
        expect(nextState.anArray[1]).toBe('a')
        expect(nextState.anArray[2]).toBe('b')
      })

      it('can truncate via the length property', () => {
        const baseLength = baseState.anArray.length
        const nextState = produce(reactive(baseState), (s) => {
          s.anArray.length = baseLength - 1
        })
        expect(nextState.anArray).not.toBe(baseState.anArray)
        expect(nextState.anArray.length).toBe(baseLength - 1)
      })

      it('can extend via the length property', () => {
        const baseLength = baseState.anArray.length
        const nextState = produce(reactive(baseState), (s) => {
          s.anArray.length = baseLength + 1
        })
        expect(nextState.anArray).not.toBe(baseState.anArray)
        expect(nextState.anArray.length).toBe(baseLength + 1)
      })

      // Reported here: https://github.com/mweststrate/immer/issues/116
      it('can pop then push', () => {
        const base = [1, 2, 3]
        const origin = base
        const nextState = produce(reactive(base), (s) => {
          s.pop()
          s.push(100)
        })
        expect(base).toEqual(origin)
        expect(nextState).toEqual([1, 2, 100])
      })

      it('can be sorted', () => {
        const baseState = [3, 1, 2]
        const nextState = produce(reactive(baseState), (s) => {
          s.sort()
        })
        expect(nextState).not.toBe(baseState)
        expect(nextState).toEqual([1, 2, 3])
      })

      it('supports modifying nested objects', () => {
        const baseState = [{ a: 1 }, {}]
        const nextState = produce(reactive(baseState), (s) => {
          s[0].a++
          s[1].a = 0
        })
        expect(nextState).not.toBe(baseState)
        expect(nextState[0].a).toBe(2)
        expect(nextState[1].a).toBe(0)
      })

      it('never preserves non-numeric properties', () => {
        const baseState = []
        baseState.x = 7
        const nextState = produce(reactive(baseState), (s) => {
          s.push(3)
        })
        expect('x' in nextState).toBeFalsy()
      })

      it('throws when a non-numeric property is added', () => {
        expect(() => {
          produce(reactive([]), (d) => {
            d.x = 3
          })
        }).not.toThrow()
      })

      it('throws when a non-numeric property is deleted', () => {
        expect(() => {
          const baseState = []
          baseState.x = 7
          produce(reactive(baseState), (d) => {
            delete d.x
          })
        }).not.toThrow()
      })
    })

    // describe('map drafts', () => {
    //   it('supports key access', () => {
    //     const value = baseState.aMap.get('jedi')
    //     const nextState = produce(reactive(baseState), (s) => {
    //       expect(s.aMap.get('jedi')).toEqual(value)
    //     })
    //     expect(nextState).toBe(baseState)
    //   })

    //   it('supports key access for non-primitive keys', () => {
    //     const key = { prop: 'val' }
    //     const base = new Map([[key, { id: 1, a: 1 }]])
    //     const value = base.get(key)
    //     const nextState = produce(base, (s) => {
    //       expect(s.get(key)).toEqual(value)
    //     })
    //     expect(nextState).toBe(base)
    //   })

    //   it('supports iteration', () => {
    //     const base = new Map([
    //       ['first', { id: 1, a: 1 }],
    //       ['second', { id: 2, a: 1 }],
    //     ])
    //     const findById = (map, id) => {
    //       for (const [, item] of map) {
    //         if (item.id === id) return item
    //       }
    //       return null
    //     }
    //     const result = produce(base, (draft) => {
    //       const obj1 = findById(draft, 1)
    //       const obj2 = findById(draft, 2)
    //       obj1.a = 2
    //       obj2.a = 2
    //     })
    //     expect(result).not.toBe(base)
    //     expect(result.get('first').a).toEqual(2)
    //     expect(result.get('second').a).toEqual(2)
    //   })

    //   it("supports 'entries'", () => {
    //     const base = new Map([
    //       ['first', { id: 1, a: 1 }],
    //       ['second', { id: 2, a: 1 }],
    //     ])
    //     const findById = (map, id) => {
    //       for (const [, item] of map.entries()) {
    //         if (item.id === id) return item
    //       }
    //       return null
    //     }
    //     const result = produce(base, (draft) => {
    //       const obj1 = findById(draft, 1)
    //       const obj2 = findById(draft, 2)
    //       obj1.a = 2
    //       obj2.a = 2
    //     })
    //     expect(result).not.toBe(base)
    //     expect(result.get('first').a).toEqual(2)
    //     expect(result.get('second').a).toEqual(2)
    //   })

    //   it("supports 'values'", () => {
    //     const base = new Map([
    //       ['first', { id: 1, a: 1 }],
    //       ['second', { id: 2, a: 1 }],
    //     ])
    //     const findById = (map, id) => {
    //       for (const item of map.values()) {
    //         if (item.id === id) return item
    //       }
    //       return null
    //     }
    //     const result = produce(base, (draft) => {
    //       const obj1 = findById(draft, 1)
    //       const obj2 = findById(draft, 2)
    //       obj1.a = 2
    //       obj2.a = 2
    //     })
    //     expect(result).not.toBe(base)
    //     expect(result.get('first').a).toEqual(2)
    //     expect(result.get('second').a).toEqual(2)
    //   })

    //   it("supports 'keys", () => {
    //     const base = new Map([
    //       ['first', Symbol()],
    //       ['second', Symbol()],
    //     ])
    //     const result = produce(base, (draft) => {
    //       expect([...draft.keys()]).toEqual(['first', 'second'])
    //       draft.set('third', Symbol())
    //       expect([...draft.keys()]).toEqual(['first', 'second', 'third'])
    //     })
    //   })

    //   it('supports forEach', () => {
    //     const key1 = { prop: 'val1' }
    //     const key2 = { prop: 'val2' }
    //     const base = new Map([
    //       ['first', { id: 1, a: 1 }],
    //       ['second', { id: 2, a: 1 }],
    //       [key1, { id: 3, a: 1 }],
    //       [key2, { id: 4, a: 1 }],
    //     ])
    //     const result = produce(base, (draft) => {
    //       let sum1 = 0
    //       draft.forEach(({ a }) => {
    //         sum1 += a
    //       })
    //       expect(sum1).toBe(4)
    //       let sum2 = 0
    //       draft.get('first').a = 10
    //       draft.get('second').a = 20
    //       draft.get(key1).a = 30
    //       draft.get(key2).a = 40
    //       draft.forEach(({ a }) => {
    //         sum2 += a
    //       })
    //       expect(sum2).toBe(100)
    //     })
    //     expect(result).not.toBe(base)
    //     expect(base.get('first').a).toEqual(1)
    //     expect(base.get('second').a).toEqual(1)
    //     expect(base.get(key1).a).toEqual(1)
    //     expect(base.get(key2).a).toEqual(1)
    //     expect(result.get('first').a).toEqual(10)
    //     expect(result.get('second').a).toEqual(20)
    //     expect(result.get(key1).a).toEqual(30)
    //     expect(result.get(key2).a).toEqual(40)
    //   })

    //   it('supports forEach mutation', () => {
    //     const base = new Map([
    //       ['first', { id: 1, a: 1 }],
    //       ['second', { id: 2, a: 1 }],
    //     ])
    //     const result = produce(base, (draft) => {
    //       draft.forEach((item) => {
    //         item.a = 100
    //       })
    //     })
    //     expect(result).not.toBe(base)
    //     expect(result.get('first').a).toEqual(100)
    //     expect(result.get('second').a).toEqual(100)
    //   })

    //   it('can assign by key', () => {
    //     const nextState = produce(reactive(baseState), (s) => {
    //       // Map.prototype.set should return the Map itself
    //       const res = s.aMap.set('force', true)
    //       // if (!global.USES_BUILD) expect(res).toBe(s.aMap[DRAFT_STATE].draft_)
    //     })
    //     expect(nextState).not.toBe(baseState)
    //     expect(nextState.aMap).not.toBe(baseState.aMap)
    //     expect(nextState.aMap.get('force')).toEqual(true)
    //   })

    //   it('can assign by a non-primitive key', () => {
    //     const key = { prop: 'val' }
    //     const value = { id: 1, a: 1 }
    //     const base = new Map([[key, value]])
    //     const nextState = produce(base, (s) => {
    //       s.set(key, true)
    //     })
    //     expect(nextState).not.toBe(base)
    //     expect(base.get(key)).toEqual(value)
    //     expect(nextState.get(key)).toEqual(true)
    //   })

    //   it('state stays the same if the the same item is assigned by key', () => {
    //     const nextState = produce(reactive(baseState), (s) => {
    //       s.aMap.set('jediTotal', 42)
    //     })
    //     expect(nextState).toBe(baseState)
    //     expect(nextState.aMap).toBe(baseState.aMap)
    //   })

    //   it("returns 'size'", () => {
    //     const nextState = produce(reactive(baseState), (s) => {
    //       s.aMap.set('newKey', true)
    //       expect(s.aMap.size).toBe(baseState.aMap.size + 1)
    //     })
    //     expect(nextState).not.toBe(baseState)
    //     expect(nextState.aMap).not.toBe(baseState.aMap)
    //     expect(nextState.aMap.get('newKey')).toEqual(true)
    //     expect(nextState.aMap.size).toEqual(baseState.aMap.size + 1)
    //   })

    //   it("can use 'delete' to remove items", () => {
    //     const nextState = produce(reactive(baseState), (s) => {
    //       expect(s.aMap.has('jedi')).toBe(true)
    //       expect(s.aMap.delete('jedi')).toBe(true)
    //       expect(s.aMap.has('jedi')).toBe(false)
    //     })
    //     expect(nextState.aMap).not.toBe(baseState.aMap)
    //     expect(nextState.aMap.size).toBe(baseState.aMap.size - 1)
    //     expect(baseState.aMap.has('jedi')).toBe(true)
    //     expect(nextState.aMap.has('jedi')).toBe(false)
    //   })

    //   it("can use 'clear' to remove items", () => {
    //     const nextState = produce(reactive(baseState), (s) => {
    //       expect(s.aMap.size).not.toBe(0)
    //       s.aMap.clear()
    //       expect(s.aMap.size).toBe(0)
    //     })
    //     expect(nextState.aMap).not.toBe(baseState.aMap)
    //     expect(baseState.aMap.size).not.toBe(0)
    //     expect(nextState.aMap.size).toBe(0)
    //   })

    //   it("support 'has'", () => {
    //     const nextState = produce(reactive(baseState), (s) => {
    //       expect(s.aMap.has('newKey')).toBe(false)
    //       s.aMap.set('newKey', true)
    //       expect(s.aMap.has('newKey')).toBe(true)
    //     })
    //     expect(nextState).not.toBe(baseState)
    //     expect(nextState.aMap).not.toBe(baseState.aMap)
    //     expect(baseState.aMap.has('newKey')).toBe(false)
    //     expect(nextState.aMap.has('newKey')).toBe(true)
    //   })

    //   it('supports nested maps', () => {
    //     const base = new Map([
    //       ['first', new Map([['second', { prop: 'test' }]])],
    //     ])
    //     const result = produce(base, (draft) => {
    //       draft.get('first').get('second').prop = 'test1'
    //     })
    //     expect(result).not.toBe(base)
    //     expect(result.get('first')).not.toBe(base.get('first'))
    //     expect(result.get('first').get('second')).not.toBe(
    //       base.get('first').get('second')
    //     )
    //     expect(base.get('first').get('second').prop).toBe('test')
    //     expect(result.get('first').get('second').prop).toBe('test1')
    //   })

    //   it('treats void deletes as no-op', () => {
    //     const base = new Map([['x', 1]])
    //     const next = produce(base, (d) => {
    //       expect(d.delete('y')).toBe(false)
    //     })
    //     expect(next).toBe(base)
    //   })

    //   it('revokes map proxies', () => {
    //     let m
    //     produce(reactive(baseState), (s) => {
    //       m = s.aMap
    //     })
    //     expect(() => m.get('x')).toThrowErrorMatchingSnapshot()
    //     expect(() => m.set('x', 3)).toThrowErrorMatchingSnapshot()
    //   })

    //   it('does not draft map keys', () => {
    //     // anything else would be terribly confusing
    //     const key = { a: 1 }
    //     const map = new Map([[key, 2]])
    //     const next = produce(map, (d) => {
    //       const dKey = Array.from(d.keys())[0]
    //       // expect(isDraft(dKey)).toBe(false)
    //       expect(dKey).toBe(key)
    //       dKey.a += 1
    //       d.set(dKey, d.get(dKey) + 1)
    //       d.set(key, d.get(key) + 1)
    //       expect(d.get(key)).toBe(4)
    //       expect(key.a).toBe(2)
    //     })
    //     const entries = Array.from(next.entries())
    //     expect(entries).toEqual([[key, 4]])
    //     expect(entries[0][0]).toBe(key)
    //     expect(entries[0][0].a).toBe(2)
    //   })

    //   it('does support instanceof Map', () => {
    //     const map = new Map()
    //     produce(map, (d) => {
    //       expect(d instanceof Map).toBeTruthy()
    //     })
    //   })

    //   it('handles clear correctly', () => {
    //     const map = new Map([
    //       ['a', 1],
    //       ['c', 3],
    //     ])
    //     const next = produce(map, (draft) => {
    //       draft.delete('a')
    //       draft.set('b', 2)
    //       draft.set('c', 4)
    //       draft.clear()
    //     })
    //     expect(next).toEqual(new Map())
    //   })
    // })

    // describe('set drafts', () => {
    //   it('supports iteration', () => {
    //     const base = new Set([
    //       { id: 1, a: 1 },
    //       { id: 2, a: 1 },
    //     ])
    //     const findById = (set, id) => {
    //       for (const item of set) {
    //         if (item.id === id) return item
    //       }
    //       return null
    //     }
    //     const result = produce(base, (draft) => {
    //       const obj1 = findById(draft, 1)
    //       const obj2 = findById(draft, 2)
    //       obj1.a = 2
    //       obj2.a = 2
    //     })
    //     expect(result).not.toBe(base)
    //     expect(base).toEqual(
    //       new Set([
    //         { id: 1, a: 1 },
    //         { id: 2, a: 1 },
    //       ])
    //     )
    //     expect(result).toEqual(
    //       new Set([
    //         { id: 1, a: 2 },
    //         { id: 2, a: 2 },
    //       ])
    //     )
    //   })

    //   it("supports 'entries'", () => {
    //     const base = new Set([
    //       { id: 1, a: 1 },
    //       { id: 2, a: 1 },
    //     ])
    //     const findById = (set, id) => {
    //       for (const [item1, item2] of set.entries()) {
    //         expect(item1).toBe(item2)
    //         if (item1.id === id) return item1
    //       }
    //       return null
    //     }
    //     const result = produce(base, (draft) => {
    //       const obj1 = findById(draft, 1)
    //       const obj2 = findById(draft, 2)
    //       obj1.a = 2
    //       obj2.a = 2
    //     })
    //     expect(result).not.toBe(base)
    //     expect(base).toEqual(
    //       new Set([
    //         { id: 1, a: 1 },
    //         { id: 2, a: 1 },
    //       ])
    //     )
    //     expect(result).toEqual(
    //       new Set([
    //         { id: 1, a: 2 },
    //         { id: 2, a: 2 },
    //       ])
    //     )
    //   })

    //   it("supports 'values'", () => {
    //     const base = new Set([
    //       { id: 1, a: 1 },
    //       { id: 2, a: 1 },
    //     ])
    //     const findById = (set, id) => {
    //       for (const item of set.values()) {
    //         if (item.id === id) return item
    //       }
    //       return null
    //     }
    //     const result = produce(base, (draft) => {
    //       const obj1 = findById(draft, 1)
    //       const obj2 = findById(draft, 2)
    //       obj1.a = 2
    //       obj2.a = 2
    //     })
    //     expect(result).not.toBe(base)
    //     expect(base).toEqual(
    //       new Set([
    //         { id: 1, a: 1 },
    //         { id: 2, a: 1 },
    //       ])
    //     )
    //     expect(result).toEqual(
    //       new Set([
    //         { id: 1, a: 2 },
    //         { id: 2, a: 2 },
    //       ])
    //     )
    //   })

    //   it("supports 'keys'", () => {
    //     const base = new Set([
    //       { id: 1, a: 1 },
    //       { id: 2, a: 1 },
    //     ])
    //     const findById = (set, id) => {
    //       for (const item of set.keys()) {
    //         if (item.id === id) return item
    //       }
    //       return null
    //     }
    //     const result = produce(base, (draft) => {
    //       const obj1 = findById(draft, 1)
    //       const obj2 = findById(draft, 2)
    //       obj1.a = 2
    //       obj2.a = 2
    //     })
    //     expect(result).not.toBe(base)
    //     expect(base).toEqual(
    //       new Set([
    //         { id: 1, a: 1 },
    //         { id: 2, a: 1 },
    //       ])
    //     )
    //     expect(result).toEqual(
    //       new Set([
    //         { id: 1, a: 2 },
    //         { id: 2, a: 2 },
    //       ])
    //     )
    //   })

    //   it('supports forEach with mutation after reads', () => {
    //     const base = new Set([
    //       { id: 1, a: 1 },
    //       { id: 2, a: 2 },
    //     ])
    //     const result = produce(base, (draft) => {
    //       let sum1 = 0
    //       draft.forEach(({ a }) => {
    //         sum1 += a
    //       })
    //       expect(sum1).toBe(3)
    //       let sum2 = 0
    //       draft.forEach((item) => {
    //         item.a += 10
    //         sum2 += item.a
    //       })
    //       expect(sum2).toBe(23)
    //     })
    //     expect(result).not.toBe(base)
    //     expect(base).toEqual(
    //       new Set([
    //         { id: 1, a: 1 },
    //         { id: 2, a: 2 },
    //       ])
    //     )
    //     expect(result).toEqual(
    //       new Set([
    //         { id: 1, a: 11 },
    //         { id: 2, a: 12 },
    //       ])
    //     )
    //   })

    //   it('state stays the same if the same item is added', () => {
    //     const nextState = produce(reactive(baseState), (s) => {
    //       s.aSet.add('Luke')
    //     })
    //     expect(nextState).toBe(baseState)
    //     expect(nextState.aSet).toBe(baseState.aSet)
    //   })

    //   it('can add new items', () => {
    //     const nextState = produce(reactive(baseState), (s) => {
    //       // Set.prototype.set should return the Set itself
    //       const res = s.aSet.add('force')
    //       // if (!global.USES_BUILD) expect(res).toBe(s.aSet[DRAFT_STATE].draft_)
    //     })
    //     expect(nextState).not.toBe(baseState)
    //     expect(nextState.aSet).not.toBe(baseState.aSet)
    //     expect(baseState.aSet.has('force')).toBe(false)
    //     expect(nextState.aSet.has('force')).toBe(true)
    //   })

    //   it("returns 'size'", () => {
    //     const nextState = produce(reactive(baseState), (s) => {
    //       s.aSet.add('newKey')
    //       expect(s.aSet.size).toBe(baseState.aSet.size + 1)
    //     })
    //     expect(nextState).not.toBe(baseState)
    //     expect(nextState.aSet).not.toBe(baseState.aSet)
    //     expect(nextState.aSet.has('newKey')).toBe(true)
    //     expect(nextState.aSet.size).toEqual(baseState.aSet.size + 1)
    //   })

    //   it("can use 'delete' to remove items", () => {
    //     const nextState = produce(reactive(baseState), (s) => {
    //       expect(s.aSet.has('Luke')).toBe(true)
    //       expect(s.aSet.delete('Luke')).toBe(true)
    //       expect(s.aSet.delete('Luke')).toBe(false)
    //       expect(s.aSet.has('Luke')).toBe(false)
    //     })
    //     expect(nextState.aSet).not.toBe(baseState.aSet)
    //     expect(baseState.aSet.has('Luke')).toBe(true)
    //     expect(nextState.aSet.has('Luke')).toBe(false)
    //     expect(nextState.aSet.size).toBe(baseState.aSet.size - 1)
    //   })

    //   it("can use 'clear' to remove items", () => {
    //     const nextState = produce(reactive(baseState), (s) => {
    //       expect(s.aSet.size).not.toBe(0)
    //       s.aSet.clear()
    //       expect(s.aSet.size).toBe(0)
    //     })
    //     expect(nextState.aSet).not.toBe(baseState.aSet)
    //     expect(baseState.aSet.size).not.toBe(0)
    //     expect(nextState.aSet.size).toBe(0)
    //   })

    //   it("supports 'has'", () => {
    //     const nextState = produce(reactive(baseState), (s) => {
    //       expect(s.aSet.has('newKey')).toBe(false)
    //       s.aSet.add('newKey')
    //       expect(s.aSet.has('newKey')).toBe(true)
    //     })
    //     expect(nextState).not.toBe(baseState)
    //     expect(nextState.aSet).not.toBe(baseState.aSet)
    //     expect(baseState.aSet.has('newKey')).toBe(false)
    //     expect(nextState.aSet.has('newKey')).toBe(true)
    //   })

    //   it('supports nested sets', () => {
    //     const base = new Set([new Set(['Serenity'])])
    //     const result = produce(base, (draft) => {
    //       draft.forEach((nestedItem) => nestedItem.add('Firefly'))
    //     })
    //     expect(result).not.toBe(base)
    //     expect(base).toEqual(new Set([new Set(['Serenity'])]))
    //     expect(result).toEqual(new Set([new Set(['Serenity', 'Firefly'])]))
    //   })

    //   it('supports has / delete on elements from the original', () => {
    //     const obj = {}
    //     const set = new Set([obj])
    //     const next = produce(set, (d) => {
    //       expect(d.has(obj)).toBe(true)
    //       d.add(3)
    //       expect(d.has(obj)).toBe(true)
    //       d.delete(obj)
    //       expect(d.has(obj)).toBe(false)
    //     })
    //     expect(next).toEqual(new Set([3]))
    //   })

    //   it('revokes sets', () => {
    //     let m
    //     produce(reactive(baseState), (s) => {
    //       m = s.aSet
    //     })
    //     expect(() => m.has('x')).toThrowErrorMatchingSnapshot()
    //     expect(() => m.add('x')).toThrowErrorMatchingSnapshot()
    //   })

    //   it('does support instanceof Set', () => {
    //     const set = new Set()
    //     produce(set, (d) => {
    //       expect(d instanceof Set).toBeTruthy()
    //     })
    //   })
    // })

    it('supports `immerable` symbol on constructor', () => {
      class One {}
      One[immerable] = true
      const baseState = new One()
      const nextState = produce(reactive(baseState), (draft) => {
        expect(draft).not.toBe(baseState)
        draft.foo = true
      })
      expect(nextState).not.toBe(baseState)
      expect(nextState.foo).toBeTruthy()
    })

    it('preserves symbol properties', () => {
      const test = Symbol('test')
      const baseState = { [test]: true }
      const nextState = produce(reactive(baseState), (s) => {
        expect(s[test]).toBeTruthy()
        s.foo = true
      })
      expect(nextState).toEqual({
        [test]: true,
        foo: true,
      })
    })

    it('preserves non-enumerable properties', () => {
      const baseState = {}
      // Non-enumerable object property
      Object.defineProperty(baseState, 'foo', {
        value: { a: 1 },
        enumerable: false,
        configurable: true,
        writable: true,
      })
      // Non-enumerable primitive property
      Object.defineProperty(baseState, 'bar', {
        value: 1,
        enumerable: false,
        configurable: true,
        writable: true,
      })
      const nextState = produce(reactive(baseState), (s) => {
        expect(s.foo).toBeTruthy()
        expect(isEnumerable(s, 'foo')).toBeFalsy()
        s.bar++
        expect(isEnumerable(s, 'foo')).toBeFalsy()
        s.foo.a++
        expect(isEnumerable(s, 'foo')).toBeFalsy()
      })
      expect(nextState.foo).toBeTruthy()
      expect(isEnumerable(nextState, 'foo')).toBeFalsy()
    })

    it('can work with own computed props', () => {
      const baseState = {
        x: 1,
        get y() {
          return this.x
        },
        set y(v) {
          this.x = v
        },
      }

      const nextState = produce(reactive(baseState), (d) => {
        expect(d.y).toBe(1)
        d.x = 2
        expect(d.x).toBe(2)
        expect(d.y).toBe(1) // this has been copied!
        d.y = 3
        expect(d.x).toBe(2)
      })
      expect(baseState.x).toBe(1)
      expect(baseState.y).toBe(1)

      expect(nextState.x).toBe(2)
      expect(nextState.y).toBe(3)
      if (!autoFreeze) {
        nextState.y = 4 // decoupled now!
        expect(nextState.y).toBe(4)
        expect(nextState.x).toBe(2)
        expect(Object.getOwnPropertyDescriptor(nextState, 'y').value).toBe(4)
      }
    })

    it('can work with class with computed props', () => {
      class State {
        [immerable] = true

        x = 1

        set y(v) {
          this.x = v
        }

        get y() {
          return this.x
        }
      }

      const baseState = new State()

      const nextState = produce(reactive(baseState), (d) => {
        expect(d.y).toBe(1)
        d.y = 2
        expect(d.x).toBe(2)
        expect(d.y).toBe(2)
        expect(Object.getOwnPropertyDescriptor(d, 'y')).toBeUndefined()
      })
      expect(baseState.x).toBe(1)
      expect(baseState.y).toBe(1)

      expect(nextState.x).toBe(2)
      expect(nextState.y).toBe(2)
      expect(Object.getOwnPropertyDescriptor(nextState, 'y')).toBeUndefined()
    })

    it('allows inherited computed properties', () => {
      const proto = {}
      Object.defineProperty(proto, 'foo', {
        get() {
          return this.bar
        },
        set(val) {
          this.bar = val
        },
      })
      proto[immerable] = true
      const baseState = Object.create(proto)
      produce(reactive(baseState), (s) => {
        expect(s.bar).toBeUndefined()
        s.foo = {}
        expect(s.bar).toBeDefined()
        expect(s.foo).toBe(s.bar)
      })
    })

    it('optimization: does not visit properties of new data structures if autofreeze is disabled and no drafts are unfinalized', () => {
      const newData = {}
      Object.defineProperty(newData, 'x', {
        enumerable: true,
        get() {
          throw new Error('visited!')
        },
      })

      const run = () =>
        produce(reactive({}), (d) => {
          d.data = newData
        })
      expect(run).toThrow()
    })

    it("same optimization doesn't cause draft from nested producers to be unfinished", () => {
      const base = {
        y: 1,
        child: {
          x: 1,
        },
      }
      const res = produce(reactive(base), (draft) => {
        draft.y++
        draft.child = produce(reactive(draft.child), (draft) => {
          return {
            wrapped: draft,
          }
        })
        draft.child.wrapped.x++
      })

      expect(res).toEqual({
        y: 2,
        child: { wrapped: { x: 2 } },
      })
    })

    it('supports a base state with multiple references to an object', () => {
      const obj = {}
      const res = produce({ a: obj, b: obj }, (d) => {
        expect(d.a).toBe(d.b)
        d.a.z = true
        expect(d.b.z).toBeTruthy()
      })
      expect(res.a.z).toBeTruthy()
      expect(res.a).toBe(res.b)
    })

    it('supports a base state with deep level multiple references to an object', () => {
      const obj = { 1: 1 }
      const base = { a: obj, b: { c: obj, 2: 2 } }
      const res = produce(reactive(base), (d) => {
        expect(d.a).toBe(d.b.c)
        d.a.z = true
        expect(d.b.c.z).toBeTruthy()
      })
      expect(res.a.z).toBeTruthy()
      expect(res.a).toBe(res.b.c)
    })

    it('supports a base state with deep level multiple references to an object No access same references', () => {
      const obj = {}
      const base = { a: obj, b: { c: obj } }
      const res = produce(reactive(base), (d) => {
        d.a.z = true
      })
      expect(res.a.z).toBeTruthy()
      expect(res.a).toBe(res.b.c)
    })

    // NOTE: Except the root draft.
    it('supports multiple references to any modified draft', () => {
      const next = produce(reactive({ a: { b: 1 } }), (d) => {
        d.a.b++
        d.b = d.a
      })
      expect(next.a).toBe(next.b)
    })

    it('can rename nested objects (no changes)', () => {
      const nextState = produce(reactive({ obj: {} }), (s) => {
        s.foo = s.obj
        delete s.obj
      })
      expect(nextState).toEqual({ foo: {} })
    })

    // Very similar to the test before, but the reused object has one
    // property changed, one added, and one removed.
    it('can rename nested objects (with changes)', () => {
      const nextState = produce(reactive({ obj: { a: 1, b: 1 } }), (s) => {
        s.obj.a = true // change
        delete s.obj.b // delete
        s.obj.c = true // add

        s.foo = s.obj
        delete s.obj
      })
      expect(nextState).toEqual({ foo: { a: true, c: true } })
    })

    it('can nest a draft in a new object', () => {
      const baseState = { obj: {} }
      const obj = baseState.obj
      const nextState = produce(reactive(baseState), (s) => {
        s.foo = { bar: s.obj }
        delete s.obj
      })
      expect(nextState.foo.bar).toEqual(obj)
    })

    it('can nest a modified draft in a new object', () => {
      const nextState = produce({ obj: { a: 1, b: 1 } }, (s) => {
        s.obj.a = true // change
        delete s.obj.b // delete
        s.obj.c = true // add

        s.foo = { bar: s.obj }
        delete s.obj
      })
      expect(nextState).toEqual({ foo: { bar: { a: true, c: true } } })
    })

    it('supports assigning undefined to an existing property', () => {
      const nextState = produce(reactive(baseState), (s) => {
        s.aProp = undefined
      })
      expect(nextState).not.toBe(baseState)
      expect(nextState.aProp).toBe(undefined)
    })

    it('supports assigning undefined to a new property', () => {
      const baseState = {}
      const nextState = produce(reactive(baseState), (s) => {
        s.aProp = undefined
      })
      expect(nextState).not.toBe(baseState)
      expect(nextState.aProp).toBe(undefined)
    })

    it('can access a child draft that was created before the draft was modified', () => {
      produce(reactive({ a: {} }), (s) => {
        const before = s.a
        s.b = 1
        expect(s.a).toBe(before)
      })
    })

    it('should reflect all changes made in the draft immediately', () => {
      produce(reactive(baseState), (draft) => {
        draft.anArray[0] = 5
        draft.anArray.unshift('test')
        if (!global.USES_BUILD)
          expect(enumerableOnly(draft.anArray)).toEqual([
            'test',
            5,
            2,
            { c: 3 },
            1,
          ])
        draft.stuffz = 'coffee'
        expect(draft.stuffz).toBe('coffee')
      })
    })

    it('support Object.defineProperty()', () => {
      const baseState = {}
      const nextState = produce(reactive(baseState), (draft) => {
        Object.defineProperty(draft, 'xx', {
          enumerable: true,
          writeable: true,
          value: 2,
        })
      })
      expect(nextState.xx).toBe(2)
    })

    it('should handle constructor correctly', () => {
      const baseState = {
        arr: new Array(),
        obj: new Object(),
      }
      const result = produce(reactive(baseState), (draft) => {
        draft.arrConstructed = draft.arr.constructor(1)
        draft.objConstructed = draft.obj.constructor(1)
      })
      expect(result.arrConstructed).toEqual(new Array().constructor(1))
      expect(result.objConstructed).toEqual(new Object().constructor(1))
    })

    it('should handle equality correctly - 1', () => {
      const baseState = {
        y: 3 / 0,
        z: NaN,
      }
      const nextState = produce(reactive(baseState), (draft) => {
        draft.y = 4 / 0
        draft.z = NaN
      })
      expect(nextState).toBe(baseState)
    })

    it('should handle equality correctly - 2', () => {
      const baseState = {
        x: -0,
      }
      const nextState = produce(reactive(baseState), (draft) => {
        draft.x = +0
      })
      expect(nextState).not.toBe(baseState)
      expect(nextState).not.toEqual({
        x: -0,
      })
    })

    // AKA: recursive produce calls
    describe('nested producers', () => {
      describe('when base state is not a draft', () => {
        // This test ensures the global state used to manage proxies is
        // never left in a corrupted state by a nested `produce` call.
        it('never affects its parent producer implicitly', () => {
          const base = { obj: { a: 1 } }
          const next = produce(reactive(base), (draft) => {
            // Notice how `base.obj` is passed, not `draft.obj`
            const obj2 = produce(reactive(base.obj), (draft2) => {
              draft2.a = 0
            })
            expect(obj2.a).toBe(0)
            expect(draft.obj.a).toBe(1) // effects should not be visible outside
          })
          expect(next).toBe(base)
        })
      })

      describe('when base state is a draft', () => {
        it('always wraps the draft in a new draft', () => {
          produce(reactive({}), (parent) => {
            produce(reactive(parent), (child) => {
              expect(child).toBe(parent)
              expect(isDraft(child)).toBeTruthy()
              expect(original(child)).toBe(original(parent))
            })
          })
        })

        // Reported by: https://github.com/mweststrate/immer/issues/343
        it('ensures each property is drafted', () => {
          produce(reactive({ a: {}, b: {} }), (parent) => {
            parent.a // Access "a" but not "b"
            produce(reactive(parent), (child) => {
              child.c = 1
              expect(isDraft(child.a)).toBeTruthy()
              expect(isDraft(child.b)).toBeTruthy()
            })
          })
        })

        it('preserves any pending changes', () => {
          produce(reactive({ a: 1, b: 1, d: 1 }), (parent) => {
            parent.b = 2
            parent.c = 2
            delete parent.d
            produce(reactive(parent), (child) => {
              expect(child.a).toBe(1) // unchanged
              expect(child.b).toBe(2) // changed
              expect(child.c).toBe(2) // added
              expect(child.d).toBeUndefined() // deleted
            })
          })
        })
      })

      describe('when base state contains a draft', () => {
        it('wraps unowned draft with its own draft', () => {
          produce(reactive({ a: {} }), (parent) => {
            parent.a.b = 'b'
            const res = produce(reactive({ a: parent.a }), (child) => {
              expect(child.a).toBe(parent.a)
              expect(isDraft(child.a)).toBeTruthy()
              expect(original(child.a)).not.toBe(parent.a)
            })
          })
        })

        it('returns unowned draft if no changes were made', () => {
          produce(reactive({ a: {} }), (parent) => {
            const result = produce({ a: parent.a }, () => {})
            expect(result.a).toBe(parent.a)
          })
        })

        it('clones the unowned draft when changes are made', () => {
          const res = produce(reactive({ a: {} }), (parent) => {
            const result = produce(reactive({ a: parent.a }), (child) => {
              child.a.b = 1
            })
            expect(result.a).not.toBe(parent.a)
            expect(result.a.b).toBe(1)
            expect('b' in parent.a).toBeFalsy()
          })
        })

        // We cannot auto-freeze the result of a nested producer,
        // because it may contain a draft from a parent producer.
        it('never auto-freezes the result', () => {
          produce(reactive({ a: {} }), (parent) => {
            const r = produce(reactive({ a: parent.a }), (child) => {
              child.b = 1 // Ensure a copy is returned.
            })
            expect(Object.isFrozen(r)).toBeFalsy()
          })
        })
      })

      // "Upvalues" are variables from a parent scope.
      it('does not finalize upvalue drafts', () => {
        produce(reactive({ a: {}, b: {} }), (parent) => {
          expect(produce(reactive({}), () => parent)).toBe(original(parent))
          parent.x // Ensure proxy not revoked.

          expect(produce(reactive({}), () => [parent])[0]).toBe(parent)
          parent.x // Ensure proxy not revoked.

          expect(produce(reactive({}), () => parent.a)).toBe(original(parent.a))
          parent.a.x // Ensure proxy not revoked.

          // Modified parent test
          parent.c = 1
          expect(produce(reactive({}), () => [parent.b])[0]).toBe(
            original(parent.b)
          )
          parent.b.x // Ensure proxy not revoked.
        })
      })
    })

    it('throws when Object.setPrototypeOf() is used on a draft', () => {
      produce(reactive({}), (draft) => {
        expect(() => Object.setPrototypeOf(draft, Array)).toThrow()
      })
    })

    it("supports the 'in' operator", () => {
      produce(reactive(baseState), (draft) => {
        // Known property
        expect('anArray' in draft).toBe(true)
        expect(Reflect.has(draft, 'anArray')).toBe(true)

        // Unknown property
        expect('bla' in draft).toBe(false)
        expect(Reflect.has(draft, 'bla')).toBe(false)

        // Known index
        expect(0 in draft.anArray).toBe(true)
        expect('0' in draft.anArray).toBe(true)
        expect(Reflect.has(draft.anArray, 0)).toBe(true)
        expect(Reflect.has(draft.anArray, '0')).toBe(true)

        // Unknown index
        expect(17 in draft.anArray).toBe(false)
        expect('17' in draft.anArray).toBe(false)
        expect(Reflect.has(draft.anArray, 17)).toBe(false)
        expect(Reflect.has(draft.anArray, '17')).toBe(false)
      })
    })

    it("'this' should not be bound anymore - 1", () => {
      const base = { x: 3 }
      const next1 = produce(reactive(base), function () {
        expect(this).toBe(undefined)
      })
    })

    it("'this' should not be bound anymore - 2", () => {
      const incrementor = produce(function () {
        expect(this).toBe(undefined)
      })
      incrementor()
    })

    it('should be possible to use dynamic bound this', () => {
      const world = {
        counter: { count: 1 },
        inc: produce(function (draft) {
          expect(this).toBe(world)
          draft.counter.count = this.counter.count + 1
        }),
      }

      expect(world.inc(reactive(world)).counter.count).toBe(2)
    })

    // See here: https://github.com/mweststrate/immer/issues/89
    it('supports the spread operator', () => {
      const base = { foo: { x: 0, y: 0 }, bar: [0, 0] }
      const result = produce(reactive(base), (draft) => {
        draft.foo = { x: 1, ...draft.foo, y: 1 }
        draft.bar = [1, ...draft.bar, 1]
      })
      expect(result).toEqual({
        foo: { x: 0, y: 1 },
        bar: [1, 0, 0, 1],
      })
    })

    it('processes with lodash.set', () => {
      const base = [{ id: 1, a: 1 }]
      const result = produce(reactive(base), (draft) => {
        lodash.set(draft, '[0].a', 2)
      })
      expect(base[0].a).toEqual(1)
      expect(result[0].a).toEqual(2)
    })

    it('processes with lodash.find', () => {
      const base = [{ id: 1, a: 1 }]
      const result = produce(reactive(base), (draft) => {
        const obj1 = lodash.find(draft, { id: 1 })
        lodash.set(obj1, 'a', 2)
      })
      expect(base[0].a).toEqual(1)
      expect(result[0].a).toEqual(2)
    })

    it('does not draft external data', () => {
      const externalData = { x: 3 }
      const base = {}
      const next = produce(reactive(base), (draft) => {
        // potentially, we *could* draft external data automatically, but only if those statements are not switched...
        draft.y = externalData
        draft.y.x += 1
        externalData.x += 2
      })
      expect(next).toEqual({ y: { x: 6 } })
      expect(externalData.x).toBe(6)
      expect(next.y).toBe(externalData)
    })

    it('does not create new state unnecessary, #491', () => {
      const a = { highlight: true }
      const next1 = produce(reactive(a), (draft) => {
        draft.highlight = false
        draft.highlight = true
      })
      // See explanation in issue
      expect(next1).not.toBe(a)

      const next2 = produce(reactive(a), (draft) => {
        draft.highlight = true
      })
      expect(next2).toBe(a)
    })

    describe('recipe functions', () => {
      it('can return a new object', () => {
        const base = { x: 3 }
        const res = produce(reactive(base), (d) => {
          return { x: d.x + 1 }
        })
        expect(res).not.toBe(base)
        expect(res).toEqual({ x: 4 })
      })

      it('can return the draft', () => {
        const base = { x: 3 }
        const res = produce(reactive(base), (d) => {
          d.x = 4
          return d
        })
        expect(res).not.toBe(base)
        expect(res).toEqual({ x: 4 })
      })

      it('can return an new object with unmodified child draft', () => {
        const base = { a: {}, b: 1 }
        const res = produce(reactive(base), (d) => {
          return {
            ...d,
            b: d.b + 1,
          }
        })
        expect(res).not.toBe(base)
        expect(res.a).toBe(base.a)
      })

      it('can return an unmodified child draft', () => {
        const base = { a: {} }
        const res = produce(reactive(base), (d) => {
          return d.a
        })
        expect(res).toBe(base.a)
      })

      // TODO: Avoid throwing if only the child draft was modified.
      it('cannot return a modified child draft', () => {
        const base = { a: {} }
        expect(() => {
          produce(reactive(base), (d) => {
            d.a.b = 1
            return d.a
          })
        }).toThrow()
      })

      it('can return an object with two references to another object', () => {
        const next = produce(reactive({}), (d) => {
          const obj = {}
          return { obj, arr: [obj] }
        })
        expect(next.obj).toBe(next.arr[0])
      })

      it('can return an object with two references to an unmodified draft', () => {
        const base = { a: {} }
        const next = produce(reactive(base), (d) => {
          return [d.a, d.a]
        })
        expect(next[0]).toBe(base.a)
        expect(next[0]).toBe(next[1])
      })

      it('cannot return an object that references itself', () => {
        const res = {}
        res.self = res
        expect(() => {
          produce(reactive(res), () => res.self)
        }).toThrow()
      })
    })

    // describe('async recipe function', () => {
    // it('can modify the draft', () => {
    //   const base = { a: 0, b: 0 }
    //   return produce(base, async (d) => {
    //     d.a = 1
    //     await Promise.resolve()
    //     d.b = 1
    //   }).then((res) => {
    //     console.log('res: ', res);
    //     // expect(res).not.toBe(base)
    //     expect(res).toEqual({ a: 1, b: 1 })
    //   })
    // })
    // it('works with rejected promises', () => {
    //   let draft
    //   const base = { a: 0, b: 0 }
    //   const err = new Error('passed')
    //   return produce(base, (d) => {
    //     draft = d
    //     draft.b = 1
    //     return Promise.reject(err)
    //   }).then(
    //     () => {
    //       throw 'failed'
    //     },
    //     (e) => {
    //       expect(e).toBe(err)
    //     }
    //   )
    // })
    // it('supports recursive produce calls after await', () => {
    //   const base = { obj: { k: 1 } }
    //   return produce(base, (d) => {
    //     const obj = d.obj
    //     delete d.obj
    //     return Promise.resolve().then(() => {
    //       d.a = produce({}, (d) => {
    //         d.b = obj // Assign a draft owned by the parent scope.
    //       })
    //       // Auto-freezing is prevented when an unowned draft exists.
    //       expect(Object.isFrozen(d.a)).toBeFalsy()
    //       // Ensure `obj` is not revoked.
    //       obj.c = 1
    //     })
    //   }).then((res) => {
    //     expect(res).not.toBe(base)
    //     expect(res).toEqual({
    //       a: { b: { k: 1, c: 1 } },
    //     })
    //   })
    // })
    // })

    it('throws when the draft is modified and another object is returned', () => {
      const base = { x: 3 }
      expect(() => {
        produce(reactive(base), (draft) => {
          draft.x = 4
          return { x: 5 }
        })
      }).toThrow()
    })

    it('should fix #117 - 1', () => {
      const reducer = (state, action) =>
        produce(reactive(state), (draft) => {
          switch (action.type) {
            case 'SET_STARTING_DOTS':
              return draft.availableStartingDots.map((a) => a)
            default:
              break
          }
        })
      const base = {
        availableStartingDots: [
          { dots: 4, count: 1 },
          { dots: 3, count: 2 },
          { dots: 2, count: 3 },
          { dots: 1, count: 4 },
        ],
      }
      const next = reducer(base, { type: 'SET_STARTING_DOTS' })
      expect(next).toEqual(base.availableStartingDots)
      expect(next).not.toBe(base.availableStartingDots)
    })

    it('should fix #117 - 2', () => {
      const reducer = (state, action) =>
        produce(reactive(state), (draft) => {
          switch (action.type) {
            case 'SET_STARTING_DOTS':
              return {
                dots: draft.availableStartingDots.map((a) => a),
              }
            default:
              break
          }
        })
      const base = {
        availableStartingDots: [
          { dots: 4, count: 1 },
          { dots: 3, count: 2 },
          { dots: 2, count: 3 },
          { dots: 1, count: 4 },
        ],
      }
      const next = reducer(base, { type: 'SET_STARTING_DOTS' })
      expect(next).toEqual({ dots: base.availableStartingDots })
    })

    it('cannot always detect noop assignments - 0', () => {
      const baseState = { x: { y: 3 } }
      const nextState = produce(reactive(baseState), (d) => {
        const a = d.x
        d.x = a
      })
      expect(nextState).toBe(baseState)
    })

    it('cannot always detect noop assignments - 1', () => {
      const baseState = { x: { y: 3 } }
      const nextState = produce(reactive(baseState), (d) => {
        const a = d.x
        d.x = 4
        d.x = a
      })
      // Ideally, this should actually be the same instances
      // but this would be pretty expensive to detect,
      // so we don't atm
      expect(nextState).not.toBe(baseState)
    })

    it('cannot always detect noop assignments - 2', () => {
      const baseState = { x: { y: 3 } }
      const nextState = produce(reactive(baseState), (d) => {
        const a = d.x
        const stuff = a.y + 3
        d.x = 4
        d.x = a
      })
      // Ideally, this should actually be the same instances
      // but this would be pretty expensive to detect,
      // so we don't atm
      expect(nextState).not.toBe(baseState)
    })

    it('cannot always detect noop assignments - 3', () => {
      const baseState = { x: 3 }
      const nextState = produce(reactive(baseState), (d) => {
        d.x = 3
      })
      expect(nextState).toBe(baseState)
    })

    it('cannot always detect noop assignments - 4', () => {
      const baseState = { x: 3 }
      const nextState = produce(reactive(baseState), (d) => {
        d.x = 4
        d.x = 3
      })
      // Ideally, this should actually be the same instances
      // but this would be pretty expensive to detect,
      // so we don't atm
      expect(nextState).not.toBe(baseState)
    })

    it('cannot produce undefined by returning undefined', () => {
      const base = 3
      expect(produce(reactive(base), () => 4)).toBe(4)
      expect(produce(reactive(base), () => null)).toBe(null)
      expect(produce(reactive(base), () => undefined)).toBe(3)
      expect(produce(reactive(base), () => {})).toBe(3)
      expect(produce(reactive(undefined), () => {})).toBe(undefined)

      expect(produce(reactive({}), () => undefined)).toEqual({})
    })

    afterEach(() => {
      expect(baseState).toBe(origBaseState)
    })
  })

  describe(`bug fix`, () => {
    it(`works with spread #524`, () => {
      const state = {
        level1: {
          level2: {
            level3: 'data',
          },
        },
      }

      const nextState = produce(reactive(state), (draft) => {
        return { ...draft }
      })
      const nextState1 = produce(reactive(state), (draft) => {
        const newLevel1 = produce(reactive(draft.level1), (level1Draft) => {
          return { ...level1Draft }
        })
        draft.level1 = newLevel1
      })

      const nextState2 = produce(reactive(state), (draft) => {
        const newLevel1 = produce(reactive(draft.level1), (level1Draft) => {
          return { ...level1Draft }
        })
        return {
          level1: newLevel1,
        }
      })

      const nextState3 = produce(reactive(state), (draft) => {
        const newLevel1 = produce(reactive(draft.level1), (level1Draft) => {
          return Object.assign({}, level1Draft)
        })
        return Object.assign(draft, {
          level1: newLevel1,
        })
      })

      const expected = { level1: { level2: { level3: 'data' } } }
      expect(nextState1).toEqual(expected)
      expect(nextState2).toEqual(expected)
      expect(nextState3).toEqual(expected)
    })

    //   // it(`Something with nested producers #522`, () => {
    //   //   function initialStateFactory() {
    //   //     return {
    //   //       substate: {
    //   //         array: [
    //   //           { id: 'id1', value: 0 },
    //   //           { id: 'id2', value: 0 },
    //   //         ],
    //   //       },
    //   //       array: [
    //   //         { id: 'id1', value: 0 },
    //   //         { id: 'id2', value: 0 },
    //   //       ],
    //   //     }
    //   //   }

    //   //   const arrayProducer = produce((draftArray) => {
    //   //     draftArray[0].value += 5
    //   //   })

    //   //   const subProducer = produce((draftSubState) => {
    //   //     draftSubState.array = arrayProducer(draftSubState.array)
    //   //   })

    //   //   const globalProducer = produce((draft) => {
    //   //     draft.substate = subProducer(draft.substate)
    //   //     draft.array = arrayProducer(draft.array)
    //   //   }, initialStateFactory())

    //   //   {
    //   //     const state = globalProducer(undefined)
    //   //     expect(state.array[0].value).toBe(5)
    //   //     expect(state.array.length).toBe(2)
    //   //     expect(state.array[1]).toMatchObject({
    //   //       id: 'id2',
    //   //       value: 0,
    //   //     })
    //   //   }

    //   //   {
    //   //     const state = globalProducer(undefined)
    //   //     expect(state.substate.array[0].value).toBe(5)
    //   //     expect(state.substate.array.length).toBe(2)
    //   //     expect(state.substate.array[1]).toMatchObject({
    //   //       id: 'id2',
    //   //       value: 0,
    //   //     })
    //   //     expect(state.substate.array).toMatchObject(state.array)
    //   //   }
    //   // })

    it('#613', () => {
      const x1 = {}
      const y1 = produce(reactive(x1), (draft) => {
        draft.foo = produce(reactive({ bar: 'baz' }), (draft1) => {
          draft1.bar = 'baa'
        })
        draft.foo.bar = 'a'
      })
      expect(y1.foo.bar).toBe('a')
    })
  })

  describe(`isDraft`, () => {
    it('returns true for object drafts', () => {
      produce(reactive({}), (state) => {
        expect(isDraft(state)).toBeTruthy()
      })
    })
    it('returns true for array drafts', () => {
      produce(reactive([]), (state) => {
        expect(isDraft(state)).toBeTruthy()
      })
    })
    it('returns true for objects nested in object drafts', () => {
      produce(reactive({ a: { b: {} } }), (state) => {
        expect(isDraft(state.a)).toBeTruthy()
        expect(isDraft(state.a.b)).toBeTruthy()
      })
    })
    it('returns false for new objects added to a draft', () => {
      produce(reactive({}), (state) => {
        state.a = {}
        expect(isDraft(state.a)).toBeFalsy()
      })
    })
    it('returns false for objects returned by the producer', () => {
      const object = produce(reactive([]), () => Object.create(null))
      expect(isDraft(object)).toBeFalsy()
    })
    it('returns false for arrays returned by the producer', () => {
      const array = produce(reactive({}), (_) => [])
      expect(isDraft(array)).toBeFalsy()
    })
    it('returns false for object drafts returned by the producer', () => {
      const object = produce(reactive({}), (state) => state)
      expect(isDraft(object)).toBeFalsy()
    })
    it('returns false for array drafts returned by the producer', () => {
      const array = produce(reactive([]), (state) => state)
      expect(isDraft(array)).toBeFalsy()
    })
  })

  // describe(`complex nesting map / set / object`, () => {
  //   const a = { a: 1 }
  //   const b = { b: 2 }
  //   const c = { c: 3 }
  //   const set1 = new Set([a, b])
  //   const set2 = new Set([c])
  //   const map = new Map([
  //     ['set1', set1],
  //     ['set2', set2],
  //   ])
  //   const base = { map }

  //   function first(set) {
  //     return Array.from(set.values())[0]
  //   }

  //   function second(set) {
  //     return Array.from(set.values())[1]
  //   }

  //   test(`modify deep object`, () => {
  //     const [res, patches] = produceWithPatches(base, (draft) => {
  //       const v = first(draft.map.get('set1'))
  //       expect(original(v)).toBe(a)
  //       expect(v).toEqual(a)
  //       expect(v).not.toBe(a)
  //       v.a++
  //     })
  //     expect(res).toMatchSnapshot()
  //     expect(patches).toMatchSnapshot()
  //     expect(a.a).toBe(1)
  //     expect(base.map.get('set1')).toBe(set1)
  //     expect(first(base.map.get('set1'))).toBe(a)
  //     expect(res).not.toBe(base)
  //     expect(res.map).not.toBe(base.map)
  //     expect(res.map.get('set1')).not.toBe(base.map.get('set1'))
  //     expect(second(base.map.get('set1'))).toBe(b)
  //     expect(base.map.get('set2')).toBe(set2)
  //     expect(first(res.map.get('set1'))).toEqual({ a: 2 })
  //   })

  //   test(`modify deep object - keep value`, () => {
  //     const [res, patches] = produceWithPatches(base, (draft) => {
  //       const v = first(draft.map.get('set1'))
  //       expect(original(v)).toBe(a)
  //       expect(v).toEqual(a)
  //       expect(v).not.toBe(a)
  //       v.a = 1 // same value
  //     })
  //     expect(a.a).toBe(1)
  //     expect(base.map.get('set1')).toBe(set1)
  //     expect(first(base.map.get('set1'))).toBe(a)
  //     expect(res).toBe(base)
  //     expect(res.map).toBe(base.map)
  //     expect(res.map.get('set1')).toBe(base.map.get('set1'))
  //     expect(first(res.map.get('set1'))).toBe(a)
  //     expect(second(base.map.get('set1'))).toBe(b)
  //     expect(base.map.get('set2')).toBe(set2)
  //     expect(patches.length).toBe(0)
  //   })
  // })
})

describe('base state type', () => {
  // testObjectTypes(produce)
})

function testObjectTypes(produce) {
  class Foo {
    constructor(foo) {
      this.foo = foo
      this[immerable] = true
    }
  }
  const values = {
    'empty object': {},
    'plain object': { a: 1, b: 2 },
    'object (no prototype)': Object.create(null),
    'empty array': [],
    'plain array': [1, 2],
    'class instance (draftable)': new Foo(1),
  }
  for (const name in values) {
    const value = values[name]
    const copy = shallowCopy(value)
    testObjectType(name, value)
  }
  function testObjectType(name, base) {
    describe(name, () => {
      it('creates a draft', () => {
        produce(reactive(base), (draft) => {
          expect(draft).not.toBe(base)
          expect(shallowCopy(draft, true)).toEqual(base)
        })
      })

      it('preserves the prototype', () => {
        const proto = Object.getPrototypeOf(base)
        produce(reactive(base), (draft) => {
          expect(Object.getPrototypeOf(draft)).toBe(proto)
        })
      })

      it('returns the base state when no changes are made', () => {
        expect(produce(reactive(base), () => {})).toBe(base)
      })

      it('returns a copy when changes are made', () => {
        const random = Math.random()
        const result = produce(reactive(base), (draft) => {
          draft[0] = random
        })
        expect(result).not.toBe(base)
        expect(result.constructor).toBe(base.constructor)
        expect(result[0]).toBe(random)
      })
    })
  }

  describe('class with getters', () => {
    class State {
      [immerable] = true
      _bar = { baz: 1 }
      foo
      get bar() {
        return this._bar
      }
      syncFoo() {
        const value = this.bar.baz
        this.foo = value
        this.bar.baz++
      }
    }
    const state = new State()

    it('should use a method to assing a field using a getter that return a non primitive object', () => {
      const newState = produce(reactive(state), (draft) => {
        draft.syncFoo()
      })
      expect(newState.foo).toEqual(1)
      expect(newState.bar).toEqual({ baz: 2 })
      expect(state.bar).toEqual({ baz: 1 })
    })
  })

  describe('super class with getters', () => {
    class BaseState {
      [immerable] = true
      _bar = { baz: 1 }
      foo
      get bar() {
        return this._bar
      }
      syncFoo() {
        const value = this.bar.baz
        this.foo = value
        this.bar.baz++
      }
    }

    class State extends BaseState {}

    const state = new State()

    it('should use a method to assing a field using a getter that return a non primitive object', () => {
      const newState = produce(reactive(state), (draft) => {
        draft.syncFoo()
      })
      expect(newState.foo).toEqual(1)
      expect(newState.bar).toEqual({ baz: 2 })
      expect(state.bar).toEqual({ baz: 2 })
    })
  })

  describe('class with setters', () => {
    class State {
      [immerable] = true
      _bar = 0
      get bar() {
        return this._bar
      }
      set bar(x) {
        this._bar = x
      }
    }
    const state = new State()

    it('should define a field with a setter', () => {
      const newState3 = produce(reactive(state), (d) => {
        d.bar = 1
        expect(d._bar).toEqual(1)
      })
      expect(newState3._bar).toEqual(1)
      expect(newState3.bar).toEqual(1)
      expect(state._bar).toEqual(0)
      expect(state.bar).toEqual(0)
    })
  })

  describe('setter only', () => {
    let setterCalled = 0
    class State {
      [immerable] = true
      x = 0
      set y(value) {
        setterCalled++
        this.x = value
      }
    }

    const state = new State()
    const next = produce(reactive(state), (draft) => {
      expect(draft.y).toBeUndefined()
      draft.y = 2 // setter is inherited, so works
      expect(draft.x).toBe(2)
    })
    expect(setterCalled).toBe(1)
    expect(next.x).toBe(2)
    expect(state.x).toBe(0)
  })

  describe('getter only', () => {
    let getterCalled = 0
    class State {
      [immerable] = true
      x = 0
      get y() {
        getterCalled++
        return this.x
      }
    }

    const state = new State()
    const next = produce(reactive(state), (draft) => {
      expect(draft.y).toBe(0)
      // expect(() => {
      //   draft.y = 2
      // }).toThrow('Cannot set property y')
      draft.x = 2
      expect(draft.y).toBe(2)
    })
    expect(next.x).toBe(2)
    expect(next.y).toBe(2)
    expect(state.x).toBe(0)
  })

  describe('own setter only', () => {
    let setterCalled = 0
    const state = {
      x: 0,
      set y(value) {
        setterCalled++
        this.x = value
      },
    }

    const next = produce(reactive(state), (draft) => {
      expect(draft.y).toBeUndefined()
      // setter is not preserved, so we can write
      draft.y = 2
      expect(draft.x).toBe(0)
      expect(draft.y).toBe(2)
    })
    expect(setterCalled).toBe(0)
    expect(next.x).toBe(0)
    expect(next.y).toBe(2)
    expect(state.x).toBe(0)
  })

  describe('own getter only', () => {
    let getterCalled = 0
    const state = {
      x: 0,
      get y() {
        getterCalled++
        return this.x
      },
    }

    const next = produce(reactive(state), (draft) => {
      expect(draft.y).toBe(0)
      // de-referenced, so stores it locally
      draft.y = 2
      expect(draft.y).toBe(2)
      expect(draft.x).toBe(0)
    })
    expect(getterCalled).toBe(1)
    expect(next.x).toBe(0)
    expect(next.y).toBe(2)
    expect(state.x).toBe(0)
  })

  describe('#620', () => {
    const customSymbol = Symbol('customSymbol')

    class TestClass {
      [immerable] = true;
      [customSymbol] = 1
    }

    /* Create class instance */
    let test0 = new TestClass()

    /* First produce. This works */
    let test1 = produce(reactive(test0), (draft) => {
      expect(draft[customSymbol]).toBe(1)
      draft[customSymbol] = 2
    })
    expect(test1).toEqual({
      [immerable]: true,
      [customSymbol]: 2,
    })

    /* Second produce. This does NOT work. See console error */
    /* With version 6.0.9, this works though */
    let test2 = produce(reactive(test1), (draft) => {
      expect(draft[customSymbol]).toBe(2)
      draft[customSymbol] = 3
    })
    expect(test2).toEqual({
      [immerable]: true,
      [customSymbol]: 3,
    })
  })
}

function enumerableOnly(x) {
  const copy = Array.isArray(x) ? x.slice() : Object.assign({}, x)
  each(copy, (prop, value) => {
    if (value && typeof value === 'object') {
      copy[prop] = enumerableOnly(value)
    }
  })
  return copy
}

function isEnumerable(base, prop) {
  const desc = Object.getOwnPropertyDescriptor(base, prop)
  return desc && desc.enumerable ? true : false
}
