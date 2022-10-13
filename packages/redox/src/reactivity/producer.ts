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
    this.effect.draftMap = new Map()
    this.effect.originMap = new Map()
  }

  get value() {
    let value: any
    value = this.effect.run()! as T
    value = this._processResult(value)
    value = this._revertNotModifyValue(value)
    this.effect.draftMap!.clear()
    this.effect.originMap!.clear()
    this.effect.stop()
    return value
  }

  private _processResult(value: any) {
    let result = value
    if (result === undefined) {
      return (result = this._getDuplication())
    }
    if (isObject(result)) {
      result = toRaw(result)
      const record = this.effect.targetRecord.get(result)
      if (record?.modified) {
        throw new Error(`cannot return a modified child draft`)
      }
      if (result === this._base) {
        result = this._getDuplication()
      } else {
        // FIXME?: it should not be reliable
        const rootNode = this.effect.targetRecord.values().next().value
        if (rootNode && rootNode.modified) {
          throw new Error(`draft is modified and another object is returned`)
        }
      }
      return result
    }

    return result
  }

  set value(_newValue: T) {
    if (process.env.NODE_ENV === 'development') {
      warn('Write operation failed: computed value is readonly')
    }
  }

  private _getDuplication(): T {
    const { targetRecord } = this.effect
    if (targetRecord.size <= 0) {
      return this._base
    }
    // const root = []
    // for (const node of targetRecord.values()) {
    //   if (node.parent === NODE_ROOT) {
    //     root.push(node)
    //   }
    // }
    // if (root.length !== 1) {
    //   warn(`only allow access one state at a immer function`)
    //   return this._base
    // }
    // const rootNode = root[0]
    const rootNode = targetRecord.values().next().value
    if (!rootNode.modified) {
      return this._base
    }
    if (!isObject(rootNode.target)) {
      return rootNode.target
    }
    return rootNode.target
  }

  private _revertNotModifyValue(value: any) {
    if (!isObject(value)) {
      return value
    }
    const { originMap, targetRecord } = this.effect
    const record = targetRecord.get(value)
    if (record && record.modified === false) {
      const base = originMap!.get(value)
      return base || value
    }
    const queue: {
      parent: any
      key: string | symbol
      value: any
    }[] = []
    Reflect.ownKeys(value).forEach((key: keyof typeof value) => {
      let childValue = value[key]
      if (isObject(childValue)) {
        if (childValue === this._base) {
          if (process.env.NODE_ENV === 'development') {
            warn(`cannot return an object that references itself`)
          }
          return
        }
        childValue = toRaw(childValue)
        queue.push({
          parent: value,
          key,
          value: childValue,
        })
      }
    })
    while (queue.length) {
      const queueItem = queue.pop()!
      let queueItemValue = queueItem.value
      const queueItemKey = queueItem.key
      const queueItemParent = queueItem.parent
      const record = targetRecord.get(queueItemValue)
      if (!record) {
      } else if (record.modified) {
        // if modified do a check, value should be copy value
        if (record.target !== queueItemValue) {
          queueItemParent[queueItemKey] = record.target
        }
      } else if (!record.modified) {
        // not modified, revert copy ref to origin state ref
        const baseValue = originMap!.get(queueItemValue)
        if (baseValue) {
          queueItemParent[queueItemKey] = baseValue
        }
        continue
      }
      // queueItemValue must be newest, queueItemParent[queueItemKey] may update
      // need update queueItemValue
      queueItemValue = queueItemParent[queueItemKey]
      Reflect.ownKeys(queueItemValue).forEach((key) => {
        let childValue = queueItemValue[key]
        if (isObject(childValue)) {
          childValue = toRaw(childValue)
          queue.push({
            parent: queueItemValue,
            key,
            value: childValue,
          })
        }
      })
    }
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
