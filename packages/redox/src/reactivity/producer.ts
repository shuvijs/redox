import { warn } from '../warning'
import {
  isFunction,
  // hasChanged,
  isObject,
  // hasOwn,
} from '../utils'
import {
  ReactiveEffect,
  // KeyAccessNode,
  // NODE_ROOT,
} from './effect'
import { ReactiveFlags, toRaw } from './reactive'

export type Recipe<T> = (...args: any[]) => T

class ProduceImpl<T extends {}> {
  public readonly effect: ReactiveEffect<T>

  public readonly [ReactiveFlags.IS_READONLY]: boolean = true

  private _base: T

  constructor(base: T, recipe: Recipe<T>, context: any) {
    this._base = toRaw(base)
    this.effect = new ReactiveEffect(recipe.bind(context, base))
  }

  get value() {
    let value: any
    value = this.effect.run()! as T
    value = this._processResult(value)
    value = this._revertNotModifyValue(value)
    this.effect.stop()
    return value
  }

  private _processResult(value: any) {
    return value
  }

  set value(_newValue: T) {
    if (process.env.NODE_ENV === 'development') {
      warn('Write operation failed: computed value is readonly')
    }
  }

  private _revertNotModifyValue(value: any) {
    return value
  }
}
export function produce<T extends {}>(recipe: (draft: T) => any): any
export function produce<T extends {}>(base: T, recipe: (draft: T) => any): any
export function produce<T extends {}>(this: any, base: any, recipe?: any): any {
  if (!isFunction(recipe)) {
    if (process.env.NODE_ENV === 'development') {
      warn(`recipe should be function, now is ${typeof recipe}`)
    }
    return toRaw(base)
  }
  const context = this

  const pRef = new ProduceImpl<T>(base, recipe, context)

  return pRef.value
}
