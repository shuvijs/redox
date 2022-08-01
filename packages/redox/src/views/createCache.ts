import validate from '../validate'
import { isObject } from '../utils'

/** A standard function returning true if two values are considered equal */
type EqualityFn = (a: any, b: any, i: number) => boolean

/** Any function with arguments */
type UnknownFunction = (...args: any[]) => unknown

type MemoizeFunction = typeof defaultMemoize

function createCacheCreator(memoize: MemoizeFunction) {
  const createSelector = <F extends UnknownFunction>(
    resultFunc: F,
    memoizeOption: { equalityCheck: EqualityFn }
  ) => {
    if (process.env.NODE_ENV === 'development') {
      validate(() => [
        [
          !isObject(memoizeOption),
          `createSelector expects an object last inputs, but received: [${typeof memoizeOption}]`,
        ],
        [
          typeof resultFunc !== 'function',
          `createSelector expects an output function after the inputs, but received: [${typeof resultFunc}]`,
        ],
      ])
    }

    const { equalityCheck } = memoizeOption

    // If a selector is called with the exact same arguments we don't need to traverse our dependencies again.
    const selector = memoize(function (...args: any[]) {
      // apply arguments instead of spreading for performance.
      return resultFunc.call(null, ...args)
    }, equalityCheck)
    return selector
  }
  return createSelector
}

const NOT_FOUND = 'NOT_FOUND'
type NOT_FOUND_TYPE = typeof NOT_FOUND

interface Entry {
  key: IArguments[]
  value: unknown
}

interface Cache {
  get(key: unknown): unknown | NOT_FOUND_TYPE
  put(key: unknown, value: unknown): void
  getEntries(): Entry[]
  clear(): void
}

function createSingletonCache(
  equals: ReturnType<typeof createCacheKeyComparator>
): Cache {
  let entry: Entry | undefined
  return {
    get(key: IArguments[]) {
      if (entry && equals(entry.key, key)) {
        return entry.value
      }

      return NOT_FOUND
    },

    put(key: IArguments[], value: unknown) {
      entry = { key, value }
    },

    getEntries() {
      return entry ? [entry] : []
    },

    clear() {
      entry = undefined
    },
  }
}

function createCacheKeyComparator(equalityCheck: EqualityFn) {
  return function areArgumentsShallowlyEqual(
    prev: unknown[] | IArguments | null,
    next: unknown[] | IArguments | null
  ): boolean {
    if (prev === null || next === null || prev.length !== next.length) {
      return false
    }
    // Do this in a for loop (and not a `forEach` or an `every`) so we can determine equality as fast as possible.
    const length = prev.length
    for (let i = 0; i < length; i++) {
      if (!equalityCheck(prev[i], next[i], i)) {
        return false
      }
    }

    return true
  }
}

// defaultMemoize now supports a configurable cache size with LRU behavior,
// and optional comparison of the result value with existing values
export function defaultMemoize<F extends UnknownFunction>(
  func: F,
  equalityCheck: EqualityFn
) {
  const comparator = createCacheKeyComparator(equalityCheck)

  const cache = createSingletonCache(comparator)

  // we reference arguments instead of spreading them for performance reasons
  function memoized() {
    let value = cache.get(arguments)
    if (value === NOT_FOUND) {
      // @ts-ignore
      value = func.apply(null, arguments)
      cache.put(arguments, value)
    }
    return value
  }

  memoized.clearCache = () => cache.clear()

  return memoized as F & { clearCache: () => void }
}

export const createCache = createCacheCreator(defaultMemoize)
