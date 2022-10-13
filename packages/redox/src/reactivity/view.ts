import { warn } from '../warning'
import { ReactiveEffect, trackView, triggerView } from './effect'
import { ReactiveFlags, toRaw } from './reactive'
import { Dep } from './dep'

export interface View<T = any> {
  dep?: Dep
  readonly value: T
  readonly effect: ReactiveEffect<T>
}

export type ViewGetter<T> = (...args: any[]) => T

export type onViewInvalidate = (fn: () => void) => () => void

export class ViewImpl<T> {
  public dep?: Dep = undefined

  public readonly effect: ReactiveEffect<T>

  public readonly [ReactiveFlags.IS_READONLY]: boolean = true

  private _value!: T

  private _cacheable: boolean

  private _dirty = true

  constructor(getter: ViewGetter<T>, disableCache?: boolean) {
    this.effect = new ReactiveEffect(getter, () => {
      if (!this._dirty) {
        this._dirty = true
        triggerView(this)
      }
    })
    this.effect.view = this
    this.effect.active = this._cacheable = !disableCache
  }

  get value() {
    // the view may get wrapped by other proxies e.g. readonly()
    const self = toRaw(this)
    trackView(self)
    if (self._dirty || !self._cacheable) {
      self._dirty = false
      self._value = self.effect.run()!
    }
    return self._value
  }

  set value(_newValue: T) {
    if (process.env.NODE_ENV === 'development') {
      warn('Write operation failed: computed value is readonly')
    }
  }
}

export function view<T>(
  getter: ViewGetter<T>,
  disableCache: boolean = false
): View<T> {
  const cRef = new ViewImpl<T>(getter, disableCache)
  return cRef
}
