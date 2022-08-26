import { TrackOpTypes, TriggerOpTypes } from './operations'
import { warn } from '../warning'
import { extend, isObject } from '../utils'
import { ViewImpl, View } from './view'
import { EffectScope, recordEffectScope } from './effectScope'

export declare const RawSymbol: unique symbol

export interface AccessRecord {
  type: TrackOpTypes | TriggerOpTypes
  value: any
}

export type KeyAccessNode = {
  parent: any | null
  record: Map<any, AccessRecord>
  modified: boolean
  target: any
}
export type TargetMap = Map<any, KeyAccessNode>

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

export const NODE_ROOT = Symbol('root')

export const NODE_DELETE = Symbol('delete')

export class ReactiveEffect<T = any> {
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
   * @internal
   */
  allowRecurse?: boolean
  /**
   * @internal
   */
  private deferStop?: boolean

  onStop?: () => void
  // dev only
  onTrack?: (event: DebuggerEvent) => void
  // dev only
  onTrigger?: (event: DebuggerEvent) => void

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
  for (const { record } of targetMap.values()) {
    record.clear()
  }
  targetMap.clear()
  views.clear()
}

export interface DebuggerOptions {
  onTrack?: (event: DebuggerEvent) => void
  onTrigger?: (event: DebuggerEvent) => void
}

export interface ReactiveEffectOptions extends DebuggerOptions {
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

export function track(
  target: object,
  type: TrackOpTypes,
  key: unknown,
  value: any
) {
  // console.log(`track: `, { target, type, key, value })
  if (shouldTrack && activeEffect) {
    const debuggerEventExtraInfo: DebuggerEventExtraInfo | undefined =
      process.env.NODE_ENV === 'development' ? { target, type, key } : undefined
    let parent = activeEffect!.targetMap.get(target)
    if (!parent) {
      activeEffect!.targetMap.set(
        target,
        (parent = {
          parent: NODE_ROOT,
          record: new Map(),
          modified: false,
          target: target,
        })
      )
    }
    parent.record.set(key, {
      type,
      value,
    })
    // process child
    if (isObject(value)) {
      let child = activeEffect!.targetMap.get(value)
      if (!child) {
        activeEffect!.targetMap.set(
          value,
          (child = {
            parent,
            record: new Map(),
            modified: false,
            target: value,
          })
        )
      } else if (child.parent !== parent) {
        child.parent = parent
      }
    }
    if (process.env.NODE_ENV === 'development' && activeEffect!.onTrack) {
      activeEffect!.onTrack({
        effect: activeEffect!,
        ...debuggerEventExtraInfo!,
      })
    }
  }
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
    // console.log('target: ', target)
    // console.log('type: ', type)
    // console.log('key: ', key)
    // console.log('newValue: ', newValue)
    // console.log('oldValue: ', oldValue)
    // console.log('oldTarget: ', oldTarget)
    const targetMap = activeEffect!.targetMap
    let modifiedTarget = targetMap.get(target)
    if (!modifiedTarget) {
      if (targetMap.size === 0) {
        targetMap.set(
          target,
          (modifiedTarget = {
            parent: NODE_ROOT,
            record: new Map(),
            modified: false,
            target: target,
          })
        )
      } else {
        console.log('activeEffect!.targetMap1111: ', activeEffect!.targetMap)
        warn(`should access target first`)
        return
      }
    }
    if (type === TriggerOpTypes.SET) {
      if (isObject(newValue)) {
        const newValueTarget = targetMap.get(newValue)
        if (newValueTarget?.parent) {
          newValueTarget.parent = modifiedTarget
        }
      }
      if (isObject(oldValue)) {
        const oldValueTarget = targetMap.get(oldValue)
        if (oldValueTarget?.parent) {
          oldValueTarget.parent = NODE_DELETE
        }
      }
    }

    if (type === TriggerOpTypes.DELETE) {
      if (isObject(oldValue)) {
        const oldValueTarget = targetMap.get(oldValue)
        if (oldValueTarget?.parent) {
          oldValueTarget.parent = NODE_DELETE
        }
      }
    }
    if (type !== TriggerOpTypes.MODIFIED) {
      modifiedTarget.record.set(key, {
        type,
        value: newValue,
      })
    }
    modifiedTarget.modified = true
    let parent = modifiedTarget.parent
    while (parent && parent.modified === false) {
      parent.modified = true
      parent = parent.parent
    }
  }
}
