import {
  reactive,
  readonly,
  toRaw,
  ReactiveFlags,
  Target,
  readonlyMap,
  reactiveMap,
  shallowReactiveMap,
  shallowReadonlyMap,
  isReadonly,
  isShallow,
} from './reactive'
import { TrackOpTypes, TriggerOpTypes } from './operations'
import {
  track,
  trigger,
  ITERATE_KEY,
  pauseTracking,
  resetTracking,
  toDraft,
  toOrigin,
  isInProducer,
} from './effect'
import {
  isObject,
  hasOwn,
  isSymbol,
  hasChanged,
  isArray,
  isIntegerKey,
  extend,
} from '../utils'
import { warn } from '../warning'

export type ProxyGetterHandler = ProxyHandler<object>['get']

export type ProxyGetter = ProxyGetterHandler

const isNonTrackableKeys = new Set<any>([`__proto__`])

const builtInSymbols = new Set(
  /*#__PURE__*/
  Object.getOwnPropertyNames(Symbol)
    // ios10.x Object.getOwnPropertyNames(Symbol) can enumerate 'arguments' and 'caller'
    // but accessing them on Symbol leads to TypeError because Symbol is a strict mode
    // function
    .filter((key) => key !== 'arguments' && key !== 'caller')
    .map((key) => (Symbol as any)[key])
    .filter(isSymbol)
)

const get = /*#__PURE__*/ createGetter()
const shallowGet = /*#__PURE__*/ createGetter(false, true)
const readonlyGet = /*#__PURE__*/ createGetter(true)
const shallowReadonlyGet = /*#__PURE__*/ createGetter(true, true)

const arrayInstrumentations = /*#__PURE__*/ createArrayInstrumentations()

function createArrayInstrumentations() {
  const instrumentations: Record<string, Function> = {}
  // instrument identity-sensitive Array methods to account for possible reactive
  // values
  ;(['includes', 'indexOf', 'lastIndexOf'] as const).forEach((key) => {
    instrumentations[key] = function (this: unknown[], ...args: unknown[]) {
      let arr = toRaw(this) as any
      for (let i = 0, l = this.length; i < l; i++) {
        track(arr, TrackOpTypes.GET, i + '', Reflect.get(arr, i))
      }
      // we run the method using the original args first (which may be reactive)
      const res = arr[key](...args)
      if (res === -1 || res === false) {
        // if that didn't work, run it again using raw values.
        return arr[key](...args.map(toRaw))
      } else {
        return res
      }
    }
  })
  // instrument length-altering mutation methods to avoid length being tracked
  // which leads to infinite loops in some cases (#2137)
  ;(['push', 'pop', 'shift', 'unshift', 'splice'] as const).forEach((key) => {
    instrumentations[key] = function (this: unknown[], ...args: unknown[]) {
      pauseTracking()
      let target = toRaw(this) as any
      target = toDraft(target)
      const res = target[key].apply(this, args)
      resetTracking()
      trigger(target, TriggerOpTypes.MODIFIED, key, args, null)
      return res
    }
  })
  return instrumentations
}

function createGetter(isReadonly = false, shallow = false): ProxyGetter {
  return function get(target: Target, key: string | symbol, receiver: object) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly
    } else if (key === ReactiveFlags.IS_SHALLOW) {
      return shallow
    } else if (
      key === ReactiveFlags.RAW &&
      receiver ===
        (isReadonly
          ? shallow
            ? shallowReadonlyMap
            : readonlyMap
          : shallow
          ? shallowReactiveMap
          : reactiveMap
        ).get(target)
    ) {
      return target
    }

    const originTarget = target
    target = toDraft(target)
    if (originTarget !== target) {
      receiver = target
    }

    const targetIsArray = isArray(target)
    if (!isReadonly && targetIsArray && hasOwn(arrayInstrumentations, key)) {
      return Reflect.get(arrayInstrumentations, key, receiver)
    }

    let res = Reflect.get(target, key, receiver)

    const isResObj = isObject(res)

    let isOriginValue = true
    if (isInProducer() && isResObj) {
      const baseTarget = toOrigin(target) as any
      isOriginValue = !hasChanged(baseTarget[key], res)
      if (isOriginValue) {
        const rawRes = toRaw(res) // res may be proxy??
        res = toDraft(rawRes, true)
        ;(target as any)[key] = res
        console.log('target', target)
      }
    }

    if (isSymbol(key) ? builtInSymbols.has(key) : isNonTrackableKeys.has(key)) {
      return res
    }

    track(target, TrackOpTypes.GET, key, res)

    if (isInProducer() && !isOriginValue) {
      // if res isn't a proxy , it should be a external object, keep it as it is.
      return reactiveMap.get(res) || res
    }

    if (shallow) {
      return res
    }

    if (isResObj) {
      // Convert returned value into a proxy as well. we do the isObject check
      // here to avoid invalid value warning. Also need to lazy access readonly
      // and reactive here to avoid circular dependency.
      return isReadonly ? readonly(res) : reactive(res)
    }

    return res
  }
}

const set = /*#__PURE__*/ createSetter()
const shallowSet = /*#__PURE__*/ createSetter(true)

function createSetter(shallow = false) {
  return function set(
    target: object,
    key: string | symbol,
    value: unknown,
    receiver: object
  ): boolean {
    const originTarget = target
    console.log('target', target)
    console.log('key', key)

    target = toDraft(target)
    console.log('target', target)
    if (originTarget !== target) {
      receiver = target
    }

    let oldValue = (target as any)[key]
    if (isReadonly(oldValue)) {
      return false
    }
    if (!shallow) {
      if (!isShallow(value) && !isReadonly(value)) {
        oldValue = toRaw(oldValue)
        value = toRaw(value)
      }
    } else {
      // in shallow mode, objects are set as-is regardless of reactive or not
    }

    const hadKey =
      isArray(target) && isIntegerKey(key)
        ? Number(key) < target.length
        : hasOwn(target, key)

    const result = Reflect.set(target, key, value, receiver)
    // don't trigger if target is something up in the prototype chain of original
    if (target === toRaw(receiver)) {
      if (!hadKey) {
        trigger(target, TriggerOpTypes.ADD, key, value)
      } else if (hasChanged(value, oldValue)) {
        trigger(target, TriggerOpTypes.SET, key, value, oldValue)
      }
    }
    return result
  }
}

function deleteProperty(target: object, key: string | symbol): boolean {
  target = toDraft(target)
  const hadKey = hasOwn(target, key)
  const oldValue = (target as any)[key]
  const result = Reflect.deleteProperty(target, key)
  if (result && hadKey) {
    trigger(target, TriggerOpTypes.DELETE, key, undefined, oldValue)
  }
  return result
}

function has(target: object, key: string | symbol): boolean {
  target = toDraft(target)
  const result = Reflect.has(target, key)
  if (!isSymbol(key) || !builtInSymbols.has(key)) {
    track(target, TrackOpTypes.HAS, key, result)
  }
  return result
}

function ownKeys(target: object): (string | symbol)[] {
  target = toDraft(target)
  track(
    target,
    TrackOpTypes.ITERATE,
    isArray(target) ? 'length' : ITERATE_KEY,
    null
  )
  return Reflect.ownKeys(target)
}

function getOwnPropertyDescriptor(target: object, key: keyof typeof target) {
  target = toDraft(target)
  const desc = Reflect.getOwnPropertyDescriptor(target, key)
  if (!desc) return desc
  return {
    writable: true,
    configurable: !isArray(target) || key !== 'length',
    enumerable: desc.enumerable,
    value: target[key],
  }
}

function setPrototypeOf(_target: object, _v: object | null): boolean {
  if (process.env.NODE_ENV === 'development') {
    warn(`not allow setPrototypeOf to set prototype`)
  }
  return false
}

export const mutableHandlers: ProxyHandler<object> = {
  get,
  set,
  deleteProperty,
  has,
  ownKeys,
  setPrototypeOf,
  getOwnPropertyDescriptor,
}

export const readonlyHandlers: ProxyHandler<object> = {
  get: readonlyGet,
  set(target, key) {
    if (process.env.NODE_ENV === 'development') {
      warn(
        `Set operation on key "${String(key)}" failed: target is readonly.`,
        target
      )
    }
    return true
  },
  deleteProperty(target, key) {
    if (process.env.NODE_ENV === 'development') {
      warn(
        `Delete operation on key "${String(key)}" failed: target is readonly.`,
        target
      )
    }
    return true
  },
}

export const shallowReactiveHandlers = /*#__PURE__*/ extend(
  {},
  mutableHandlers,
  {
    get: shallowGet,
    set: shallowSet,
  }
)

// Props handlers are special in the sense that it should not unwrap top-level
// refs (in order to allow refs to be explicitly passed down), but should
// retain the reactivity of the normal readonly object.
export const shallowReadonlyHandlers = /*#__PURE__*/ extend(
  {},
  readonlyHandlers,
  {
    get: shallowReadonlyGet,
  }
)
