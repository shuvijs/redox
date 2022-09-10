import { TrackOpTypes, TriggerOpTypes } from './operations'
import { extend, isObject, shallowCopy } from '../utils'
import { ViewImpl, View } from './view'
import { toRaw } from './reactive'
import { EffectScope, recordEffectScope } from './effectScope'

export interface AccessRecord {
  type: TrackOpTypes | TriggerOpTypes
  value: any
}

export type KeyAccessNode = {
  parent: KeyAccessNode | null
  record: Map<any, AccessRecord>
  modified: boolean
  target: any
}

export type TargetMap = Map<any, KeyAccessNode>

export type DraftMap = Map<any, any>

export type OriginMap = Map<any, any>

export type EffectScheduler = (...args: any[]) => any

export type DebuggerEvent = {
  effect: ReactiveEffect
} & DebuggerEventExtraInfo

export type DebuggerEventExtraInfo = {
  target: object
  type: TrackOpTypes | TriggerOpTypes
  key: any
  newValue?: any
  oldValue?: any
  oldTarget?: Map<any, any> | Set<any>
}

export let activeEffect: ReactiveEffect | undefined

export const ITERATE_KEY = Symbol(
  process.env.NODE_ENV === 'development' ? 'iterate' : ''
)
export const MAP_KEY_ITERATE_KEY = Symbol(
  process.env.NODE_ENV === 'development' ? 'Map key iterate' : ''
)

export const NODE_DELETE = Symbol('delete')

export class ReactiveEffect<T = any> {
  // target -> reactive
  targetMap: TargetMap = new Map()

  views = new Map<View<any>, any>()

  active = true

  parent: ReactiveEffect | undefined = undefined

  /**
   * Can be attached after creation
   * @internal
   */
  view?: ViewImpl<T>

  /**
   * Can be attached after creation
   * origin -> draft
   * @internal
   */
  draftMap?: DraftMap

  /**
   * Can be attached after creation
   * draft -> origin
   * @internal
   */
  originMap?: OriginMap

  /**
   * @internal
   */
  allowRecurse?: boolean
  /**
   * @internal
   */
  private deferStop?: boolean

  onStop?: () => void

  constructor(
    public fn: () => T,
    public scheduler: EffectScheduler | null = null,
    scope?: EffectScope
  ) {
    recordEffectScope(this, scope)
  }

  run() {
    if (!this.active) {
      return this.fn()
    }
    let parent: ReactiveEffect | undefined = activeEffect
    let lastShouldTrack = shouldTrack
    while (parent) {
      if (parent === this) {
        return
      }
      parent = parent.parent
    }
    try {
      this.parent = activeEffect
      activeEffect = this
      shouldTrack = true

      cleanupEffect(this)
      return this.fn()
    } finally {
      activeEffect = this.parent
      shouldTrack = lastShouldTrack
      this.parent = undefined

      if (this.deferStop) {
        this.stop()
      }
    }
  }

  stop() {
    // stopped while running itself - defer the cleanup
    if (activeEffect === this) {
      this.deferStop = true
    } else if (this.active) {
      cleanupEffect(this)
      if (this.onStop) {
        this.onStop()
      }
      this.active = false
    }
  }
}

function cleanupEffect(effect: ReactiveEffect) {
  const { targetMap, views } = effect
  targetMap.clear()
  views.clear()
}

export interface ReactiveEffectOptions {
  lazy?: boolean
  scheduler?: EffectScheduler
  scope?: EffectScope
  allowRecurse?: boolean
  onStop?: () => void
}

export interface ReactiveEffectRunner<T = any> {
  (): T
  effect: ReactiveEffect
}

export function effect<T = any>(
  fn: () => T,
  options?: ReactiveEffectOptions
): ReactiveEffectRunner {
  if ((fn as ReactiveEffectRunner).effect) {
    fn = (fn as ReactiveEffectRunner).effect.fn
  }

  const _effect = new ReactiveEffect(fn)
  if (options) {
    extend(_effect, options)
    if (options.scope) recordEffectScope(_effect, options.scope)
  }
  if (!options || !options.lazy) {
    _effect.run()
  }
  const runner = _effect.run.bind(_effect) as ReactiveEffectRunner
  runner.effect = _effect
  return runner
}

export function stop(runner: ReactiveEffectRunner) {
  runner.effect.stop()
}

export let shouldTrack = true
const trackStack: boolean[] = []

export function pauseTracking() {
  trackStack.push(shouldTrack)
  shouldTrack = false
}

export function enableTracking() {
  trackStack.push(shouldTrack)
  shouldTrack = true
}

export function resetTracking() {
  const last = trackStack.pop()
  shouldTrack = last === undefined ? true : last
}

export function isDraft(target: any): boolean {
  return activeEffect?.originMap?.has(target) ?? false
}

export function toDraft<T>(target: T, force?: boolean): T {
  if (activeEffect && activeEffect.draftMap) {
    const draftMap = activeEffect.draftMap
    const originMap = activeEffect.originMap!
    let draft = draftMap.get(target)
    if (force || !draft) {
      draft = makeDraft(draftMap, originMap, target)
    }
    return draft
  }

  return target
}

export function isExternal(target: any, key: any, record: AccessRecord) {
  const origin = toOrigin(target)
  return origin[key] != undefined
}

export function toOrigin<T>(target: T): T {
  return activeEffect?.originMap?.get(target) ?? target
}

export function track(
  target: object,
  type: TrackOpTypes,
  key: unknown,
  value: any
): AccessRecord | null {
  if (shouldTrack && activeEffect) {
    const targetMap = activeEffect.targetMap
    let currentRecord: AccessRecord
    let current = targetMap.get(target)
    if (!current) {
      targetMap.set(
        target,
        (current = {
          parent: null,
          record: new Map(),
          modified: false,
          target: target,
        })
      )
    }

    const hasExternalValueRecord = current.record.has(key)
    current.record.set(
      key,
      (currentRecord = {
        type,
        value,
      })
    )

    if (activeEffect.draftMap && isObject(value)) {
      // process child
      let child = targetMap.get(value)
      if (!child) {
        if (!hasExternalValueRecord) {
          const rawValue = toRaw(value) // res may be proxy??
          value = makeDraft(
            activeEffect.draftMap!,
            activeEffect.originMap!,
            rawValue
          )
        }
        activeEffect!.targetMap.set(
          value,
          (child = {
            parent: current,
            record: new Map(),
            modified: false,
            target: value,
          })
        )
        currentRecord.value = value
        ;(target as any)[key as any] = value
      } else if (child.parent !== current) {
        child.parent = current
      }

      return currentRecord
    }
  }

  return null
}

export function trackView(view: View<any>, value: any) {
  if (shouldTrack && activeEffect) {
    activeEffect.views.set(view, value)
  }
}

export function trigger(
  target: object,
  type: TriggerOpTypes,
  key?: unknown,
  newValue?: unknown,
  oldValue?: unknown,
  oldTarget?: Map<unknown, unknown> | Set<unknown>
) {
  if (shouldTrack && activeEffect) {
    const targetMap = activeEffect!.targetMap
    let modifiedTarget = targetMap.get(target)
    if (!modifiedTarget) {
      if (targetMap.size === 0) {
        targetMap.set(
          target,
          (modifiedTarget = {
            parent: null,
            record: new Map(),
            modified: false,
            target: target,
          })
        )
      } else {
        return
      }
    }

    modifiedTarget.record.set(key, {
      type,
      value: newValue,
    })

    switch (type) {
      case TriggerOpTypes.SET:
        setTargetParentValue(targetMap, newValue, modifiedTarget)
        setTargetParentValue(targetMap, oldValue, NODE_DELETE)
        break
      case TriggerOpTypes.DELETE:
        setTargetParentValue(targetMap, oldValue, NODE_DELETE)
        break
      default:
        break
    }
    modifiedTarget.modified = true
    let parent = modifiedTarget.parent
    while (parent && parent.modified === false) {
      parent.modified = true
      parent = parent.parent
    }
  }
}

export function makeDraft<T>(
  draftMap: DraftMap,
  originMap: OriginMap,
  target: T
): T {
  const draft = shallowCopy(target)
  // don't delete for debug
  // draft.__r_copy = true
  // draft.__r_copy_id = Math.random().toFixed(3)
  draftMap.set(target, draft)
  draftMap.set(draft, draft)
  originMap.set(draft, target)
  return draft
}

function setTargetParentValue(targetMap: TargetMap, target: any, value: any) {
  if (isObject(target)) {
    const currentTarget = targetMap.get(target)
    if (currentTarget?.parent) {
      currentTarget.parent = value
    }
  }
}
