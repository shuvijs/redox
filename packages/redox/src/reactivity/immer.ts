import { warn } from '../warning'
import {
  // hasChanged,
  isObject,
  // hasOwn
} from '../utils'
import {
  DebuggerOptions,
  ReactiveEffect,
  // KeyAccessNode,
  // NODE_ROOT,
} from './effect'
import { ReactiveFlags, toRaw, reactive } from './reactive'

export interface View<T = any> {
  readonly value: T
  readonly effect: ReactiveEffect<T>
}

export type Recipe<T> = (...args: any[]) => T

export class ProduceImpl<T extends {}> {
  public readonly effect: ReactiveEffect<T>

  public readonly [ReactiveFlags.IS_READONLY]: boolean = true

  private _base: T

  constructor(base: T, recipe: Recipe<T>) {
    this._base = base

    const fn = function () {
      const draft = reactive(base)
      //@ts-ignore
      return recipe.call(null, draft)
    }
    this.effect = new ReactiveEffect(fn)
  }

  get value() {
    // the view may get wrapped by other proxies e.g. readonly() #3376
    const self = toRaw(this)
    let value = self.effect.run()! as T
    if (value) {
      value = toRaw(value)
    } else {
      value = this._getDuplication()
    }
    self.effect.stop()
    return value
  }

  set value(_newValue: T) {
    if (process.env.NODE_ENV === 'development') {
      warn('Write operation failed: computed value is readonly')
    }
  }

  private _getDuplication(): T {
    const { targetMap } = this.effect
    console.log('targetMap: ', targetMap)
    if (targetMap.size <= 0) {
      return this._base
    }
    // const root = []
    // for (const node of targetMap.values()) {
    //   if (node.parent === NODE_ROOT) {
    //     root.push(node)
    //   }
    // }
    // if (root.length !== 1) {
    //   warn(`only allow access one state at a immer function`)
    //   return this._base
    // }
    // const rootNode = root[0]
    const rootNode = targetMap.values().next().value
    if (!rootNode.modified) {
      return this._base
    }
    if (!isObject(rootNode.target)) {
      return rootNode.target
    }
    const rootDuplication = shallowCopy(rootNode.target)
    const queue: {
      parent: any
      key: string | symbol
      value: any
    }[] = []
    Reflect.ownKeys(rootDuplication).forEach((key) => {
      const value = rootDuplication[key]
      if (isObject(value)) {
        queue.push({
          parent: rootDuplication,
          key,
          value,
        })
      }
    })

    while (queue.length) {
      const queueItem = queue.pop()!
      const node = targetMap.get(queueItem.value)
      if (node?.modified) {
        const valueDuplication = shallowCopy(node.target)
        queueItem.parent[queueItem.key] = valueDuplication
        Reflect.ownKeys(valueDuplication).forEach((key) => {
          const value = valueDuplication[key]
          if (isObject(value)) {
            queue.push({
              parent: valueDuplication,
              key,
              value,
            })
          }
        })
      }
    }

    return rootDuplication
  }
}

export function produce<T extends {}>(
  base: T,
  recipe: (draft: T) => any,
  debugOptions?: DebuggerOptions
) {
  const pRef = new ProduceImpl<T>(base, recipe)

  if (process.env.NODE_ENV === 'development' && debugOptions) {
    pRef.effect.onTrack = debugOptions.onTrack
    pRef.effect.onTrigger = debugOptions.onTrigger
  }

  return pRef.value
}

const slice = Array.prototype.slice
/*#__PURE__*/
export function shallowCopy(base: any) {
  if (Array.isArray(base)) return slice.call(base)
  const descriptors = Object.getOwnPropertyDescriptors(base)
  let keys = Reflect.ownKeys(descriptors)
  for (let i = 0; i < keys.length; i++) {
    const key: any = keys[i]
    const desc = descriptors[key]
    if (desc.writable === false) {
      desc.writable = true
      desc.configurable = true
    }
    // like object.assign, we will read any _own_, get/set accessors. This helps in dealing
    // with libraries that trap values, like mobx or vue
    // unlike object.assign, non-enumerables will be copied as well
    if (desc.get || desc.set)
      descriptors[key] = {
        configurable: true,
        writable: true, // could live with !!desc.set as well here...
        enumerable: desc.enumerable,
        value: base[key],
      }
  }
  return Object.create(Object.getPrototypeOf(base), descriptors)
}
