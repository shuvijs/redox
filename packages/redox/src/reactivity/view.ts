import { warn } from '../warning'
import { hasChanged, isObject, hasOwn } from '../utils'
import { TrackOpTypes } from './operations'
import { DebuggerOptions, ReactiveEffect, trackView } from './effect'
import { ReactiveFlags, toRaw, toCompanion } from './reactive'

export interface View<T = any> {
  readonly value: T
  readonly effect: ReactiveEffect<T>
}

export type ViewGetter<T> = (...args: any[]) => T

export class ViewImpl<T> {
  private _value!: T

  private _dirty = true

  public readonly effect: ReactiveEffect<T>

  public readonly [ReactiveFlags.IS_READONLY]: boolean = true

  public _cacheable: boolean

  constructor(getter: ViewGetter<T>, disableCache: boolean) {
    this.effect = new ReactiveEffect(getter)
    this.effect.view = this
    this.effect.active = this._cacheable = !disableCache
  }

  get value() {
    // the view may get wrapped by other proxies e.g. readonly() #3376
    const self = toRaw(this)
    if (!self._cacheable) {
      self._value = self.effect.run()!
    } else {
      // validate cache
      if (self._dirty || !self._validateCache()) {
        this._dirty = false
        self._value = self.effect.run()!
      }
    }
    trackView(self, self._value)
    return self._value
  }

  set value(_newValue: T) {
    if (process.env.NODE_ENV === 'development') {
      warn('Write operation failed: computed value is readonly')
    }
  }

  private _validateCache(): boolean {
    const { targetMap, views } = this.effect
    if (targetMap.size <= 0 && views.size <= 0) {
      return true
    }

    for (const [view, value] of this.effect.views.entries()) {
      if (hasChanged(view.value, value)) {
        return false
      }
    }

    const queue: any[] = [...targetMap.keys()]
    while (queue.length) {
      const target = queue.shift()!
      const accessRecord = targetMap.get(target)
      if (!accessRecord) {
        continue
      }

      const compaion = toCompanion(target) || {}
      for (let [key, { type, value }] of accessRecord.entries()) {
        if (type === TrackOpTypes.HAS) {
          if (hasOwn(compaion, key as any) !== value) {
            return false
          }
        } else if (hasChanged(compaion[key as any], value)) {
          return false
        }

        if (isObject(value)) {
          queue.push(accessRecord.get(value))
        }
      }
    }

    return true
  }
}

export function view<T>(
  getter: ViewGetter<T>,
  disableCache: boolean = false,
  debugOptions?: DebuggerOptions
): View<T> {
  const cRef = new ViewImpl<T>(getter, disableCache)

  if (process.env.NODE_ENV === 'development' && debugOptions && !disableCache) {
    cRef.effect.onTrack = debugOptions.onTrack
    cRef.effect.onTrigger = debugOptions.onTrigger
  }

  return cRef
}
