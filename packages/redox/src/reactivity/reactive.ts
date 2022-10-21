import { isObject, toRawType, def, shallowCopy } from '../utils'
import { AnyObject } from '../types'
import { mutableHandlers, readonlyHandlers } from './baseHandlers'

export declare const RawSymbol: unique symbol

export const enum ReactiveFlags {
  SKIP = '__r_skip',
  IS_REACTIVE = '__r_isReactive',
  IS_READONLY = '__r_isReadonly',
  RAW = '__r_raw',
  STATE = '__r_state',
}

export interface Target {
  [ReactiveFlags.SKIP]?: boolean
  [ReactiveFlags.IS_REACTIVE]?: boolean
  [ReactiveFlags.IS_READONLY]?: boolean
  [ReactiveFlags.STATE]?: ReactiveState
}

export interface ReactiveState {
  id: number
  // The root state.
  root?: ReactiveState
  // The parent state.
  parent?: ReactiveState
  // The base object.
  base: AnyObject
  // The base proxy.
  proxy: AnyObject
  // The base copy with any updated values.
  copy: AnyObject | null
  // Track which properties have been assigned (true) or deleted (false).
  assigned: Record<string, boolean>
  // True for both shallow and deep changes.
  modified: boolean
  // Used during finalization.
  finalized: boolean
  // listener
  listeners: Array<() => void>
  // revoke proxy
  revoke: () => void
}

export const reactiveMap = new WeakMap<ReactiveState, any>()
export const readonlyMap = new WeakMap<ReactiveState, any>()

const enum TargetType {
  INVALID = 0,
  COMMON = 1,
  COLLECTION = 2,
}

function targetTypeMap(rawType: string) {
  switch (rawType) {
    case 'Object':
    case 'Array':
      return TargetType.COMMON
    case 'Map':
    case 'Set':
    case 'WeakMap':
    case 'WeakSet':
      return TargetType.COLLECTION
    default:
      return TargetType.INVALID
  }
}

function getTargetType(value: Target) {
  return value[ReactiveFlags.SKIP] || !Object.isExtensible(value)
    ? TargetType.INVALID
    : targetTypeMap(toRawType(value))
}

export function reactive<T extends object>(
  target: T,
  parent?: ReactiveState,
  root?: ReactiveState
): T
export function reactive(target: object, parent?: ReactiveState) {
  // if trying to observe a readonly proxy, return the readonly version.
  if (isReadonly(target)) {
    return target
  }

  return createProxyObject(target, false, mutableHandlers, reactiveMap, parent)
}

type Primitive = string | number | boolean | bigint | symbol | undefined | null
type Builtin = Primitive | Function | Date | Error | RegExp
export type DeepReadonly<T> = T extends Builtin
  ? T
  : T extends Map<infer K, infer V>
  ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
  : T extends ReadonlyMap<infer K, infer V>
  ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
  : T extends WeakMap<infer K, infer V>
  ? WeakMap<DeepReadonly<K>, DeepReadonly<V>>
  : T extends Set<infer U>
  ? ReadonlySet<DeepReadonly<U>>
  : T extends ReadonlySet<infer U>
  ? ReadonlySet<DeepReadonly<U>>
  : T extends WeakSet<infer U>
  ? WeakSet<DeepReadonly<U>>
  : T extends Promise<infer U>
  ? Promise<DeepReadonly<U>>
  : T extends {}
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : Readonly<T>

/**
 * Creates a readonly copy of the original object. Note the returned copy is not
 * made reactive, but `readonly` can be called on an already reactive object.
 */
export function readonly<T extends object>(
  target: T,
  parent?: ReactiveState
): DeepReadonly<T> {
  return createProxyObject(target, true, readonlyHandlers, readonlyMap, parent)
}

let uid = 0
function createProxyObject(
  target: Target,
  isReadonly: boolean,
  baseHandlers: ProxyHandler<any>,
  proxyMap: WeakMap<ReactiveState, any>,
  parent?: ReactiveState
) {
  if (!isObject(target)) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`value cannot be made reactive: ${String(target)}`)
    }
    return target
  }
  // target is already a Proxy, return it.
  // exception: calling readonly() on a reactive object
  if (
    target[ReactiveFlags.STATE] &&
    !(isReadonly && target[ReactiveFlags.IS_REACTIVE])
  ) {
    return target
  }
  // only specific value types can be observed.
  const targetType = getTargetType(target)
  if (targetType === TargetType.INVALID) {
    return target
  }

  const isArray = Array.isArray(target)
  let state: ReactiveState = {
    id: uid++,
    root: null as any, // set below
    parent: parent,
    base: target,
    proxy: null as any, // set below
    copy: null,
    assigned: {},
    modified: false,
    finalized: false,
    listeners: [],
    revoke: null as any, // set below
  }
  if (isArray) {
    const initValue = state
    state = [] as any as ReactiveState
    Object.keys(initValue).forEach((key) => {
      Object.defineProperty(state, key, {
        configurable: true,
        enumerable: true,
        writable: true,
        value: initValue[key as keyof typeof initValue],
      })
    })
  }

  const { proxy, revoke } = Proxy.revocable(state, baseHandlers)
  state.proxy = proxy
  state.revoke = revoke
  state.root = parent ? parent.root : state

  proxyMap.set(state, proxy)

  return proxy
}

export function isReactive(value: unknown): boolean {
  if (isReadonly(value)) {
    return isReactive((value as Target)[ReactiveFlags.STATE])
  }
  return !!(value && (value as Target)[ReactiveFlags.IS_REACTIVE])
}

export function isReadonly(value: unknown): boolean {
  return !!(value && (value as Target)[ReactiveFlags.IS_READONLY])
}

export function toState<T>(observed: T): ReactiveState | undefined {
  return observed && (observed as Target)[ReactiveFlags.STATE]
}

export function toRaw<T>(observed: T): T {
  const raw = toState(observed)
  return raw ? toRaw(raw.base as any) : observed
}

export function markRaw<T extends object>(
  value: T
): T & { [RawSymbol]?: true } {
  def(value, ReactiveFlags.SKIP, true)
  return value
}

export function isDraft(value: any): boolean {
  return !!value && !!value[ReactiveFlags.STATE]
}

export function isDraftable(value: any): boolean {
  if (!value) return false
  return getTargetType(value) !== TargetType.INVALID
}

export function latest(state: ReactiveState) {
  return state.copy || state.base
}

export function prepareCopy(state: { base: any; copy: any }) {
  if (!state.copy) {
    state.copy = shallowCopy(state.base)
  }
}

export function markChanged(state: ReactiveState) {
  if (!state.modified) {
    state.modified = true
    if (state.parent) {
      markChanged(state.parent)
    }
  }
}
