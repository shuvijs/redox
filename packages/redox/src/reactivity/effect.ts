import { TrackOpTypes, TriggerOpTypes } from './operations'
import {
  extend,
  isObject,
  shallowCopy,
  isArray,
  isMap,
  isIntegerKey,
} from '../utils'
import { ViewImpl, View } from './view'
import { toRaw } from './reactive'
import { EffectScope, recordEffectScope } from './effectScope'
import { Dep, createDep } from './dep'

// The main WeakMap that stores {target -> key -> dep} connections.
// Conceptually, it's easier to think of a dependency as a Dep class
// which maintains a Set of subscribers, but we simply store them as
// raw Sets to reduce memory overhead.
type KeyToDepMap = Map<any, Dep>
const targetMap = new WeakMap<any, KeyToDepMap>()

export let trackOpBit = 1

export interface AccessRecord {
  type: TrackOpTypes | TriggerOpTypes
  value: any
}

export type KeyAccessNode = {
  parent: KeyAccessNode | null
  record: Map<any, AccessRecord>
  modified: boolean
  target: object
}

export type TargetRecord = Map<any, KeyAccessNode>

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
  // target -> KeyAccessNode
  targetRecord: TargetRecord = new Map()

  deps: Dep[] = []

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
  const { targetRecord } = effect
  targetRecord.clear()
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
    let depsMap = targetMap.get(target)
    if (!depsMap) {
      targetMap.set(target, (depsMap = new Map()))
    }
    let dep = depsMap.get(key)
    if (!dep) {
      depsMap.set(key, (dep = createDep()))
    }

    trackEffects(dep)

    if (activeEffect.draftMap) {
      const targetRecord = activeEffect.targetRecord
      let currentRecord: AccessRecord
      let current = targetRecord.get(target)
      if (!current) {
        targetRecord.set(
          target,
          (current = {
            parent: null,
            record: new Map(),
            modified: false,
            target,
          })
        )
      }

      // if record of key exist, it's a external value
      const isExternalValue = current.record.has(key)
      current.record.set(
        key,
        (currentRecord = {
          type,
          value,
        })
      )

      if (isObject(value)) {
        // process child
        let child = targetRecord.get(value)
        if (!child) {
          if (!isExternalValue) {
            const rawValue = toRaw(value) // res may be proxy??
            value = makeDraft(
              activeEffect.draftMap!,
              activeEffect.originMap!,
              rawValue
            )
          }
          activeEffect!.targetRecord.set(
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
  }

  return null
}

export function trackEffects(dep: Dep) {
  let shouldTrack = false
  // Full cleanup mode.
  shouldTrack = !dep.has(activeEffect!)

  if (shouldTrack) {
    dep.add(activeEffect!)
    activeEffect!.deps.push(dep)
  }
}

export function trackView(view: View<any>) {
  if (shouldTrack && activeEffect) {
    view = toRaw(view)
    trackEffects(view.dep || (view.dep = createDep()))
  }
}
export function triggerView(view: View<any>, newVal?: any) {
  view = toRaw(view)
  if (view.dep) {
    triggerEffects(view.dep)
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
    const targetRecord = activeEffect!.targetRecord
    let modifiedTarget = targetRecord.get(target)
    if (!modifiedTarget) {
      if (targetRecord.size === 0) {
        targetRecord.set(
          target,
          (modifiedTarget = {
            parent: null,
            record: new Map(),
            modified: false,
            target,
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
        setTargetParentValue(targetRecord, newValue, modifiedTarget)
        setTargetParentValue(targetRecord, oldValue, NODE_DELETE)
        break
      case TriggerOpTypes.DELETE:
        setTargetParentValue(targetRecord, oldValue, NODE_DELETE)
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

  target = toOrigin(target)
  const depsMap = targetMap.get(target)
  if (!depsMap) {
    // never been tracked
    return
  }

  let deps: (Dep | undefined)[] = []
  if (type === TriggerOpTypes.CLEAR) {
    // collection being cleared
    // trigger all effects for target
    deps = [...depsMap.values()]
  } else if (key === 'length' && isArray(target)) {
    depsMap.forEach((dep, key) => {
      if (key === 'length' || key >= (newValue as number)) {
        deps.push(dep)
      }
    })
  } else {
    // schedule runs for SET | ADD | DELETE
    if (key !== void 0) {
      deps.push(depsMap.get(key))
    }

    // also run for iteration key on ADD | DELETE | Map.SET
    switch (type) {
      case TriggerOpTypes.ADD:
        if (!isArray(target)) {
          deps.push(depsMap.get(ITERATE_KEY))
          if (isMap(target)) {
            deps.push(depsMap.get(MAP_KEY_ITERATE_KEY))
          }
        } else if (isIntegerKey(key)) {
          // new index added to array -> length changes
          deps.push(depsMap.get('length'))
        }
        break
      case TriggerOpTypes.DELETE:
        if (!isArray(target)) {
          deps.push(depsMap.get(ITERATE_KEY))
          if (isMap(target)) {
            deps.push(depsMap.get(MAP_KEY_ITERATE_KEY))
          }
        }
        break
      case TriggerOpTypes.SET:
        if (isMap(target)) {
          deps.push(depsMap.get(ITERATE_KEY))
        }
        break
    }
  }

  if (deps.length === 1) {
    if (deps[0]) {
      triggerEffects(deps[0])
    }
  } else {
    const effects: ReactiveEffect[] = []
    for (const dep of deps) {
      if (dep) {
        effects.push(...dep)
      }
    }
    triggerEffects(createDep(effects))
  }
}

export function triggerEffects(dep: Dep | ReactiveEffect[]) {
  // spread into array for stabilization
  const effects = isArray(dep) ? dep : [...dep]
  for (const effect of effects) {
    if (effect.view) {
      triggerEffect(effect)
    }
  }
  for (const effect of effects) {
    if (!effect.view) {
      triggerEffect(effect)
    }
  }
}

function triggerEffect(effect: ReactiveEffect) {
  if (effect !== activeEffect || effect.allowRecurse) {
    if (effect.scheduler) {
      effect.scheduler()
    } else {
      effect.run()
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

function setTargetParentValue(
  targetRecord: TargetRecord,
  target: any,
  value: any
) {
  if (isObject(target)) {
    const currentTarget = targetRecord.get(target)
    if (currentTarget?.parent) {
      currentTarget.parent = value
    }
  }
}
