import {
  ViewOptions,
  ActionOptions,
  Deps,
  AnyModel,
  DefineModel,
} from './defineModel'
import { warn } from '../warning'
import { invariant, isPlainObject } from '../utils'

export type Optional<T> = T | undefined

export type StateObject = {
  [x: string]: any
}

export type StatePrimitive =
  | String
  | Number
  | Boolean
  | any[]
  | undefined
  | null

export type State = StateObject | StatePrimitive

export interface Action<T = any> {
  type: string
  payload?: T
  // Allows any extra properties to be defined in an action.
  [extraProps: string]: any
}

export interface ActionWithPayload<T = any> {
  type: string
  payload: T
  // Allows any extra properties to be defined in an action.
  [extraProps: string]: any
}

export type EmptyObject = { [X: string | number | symbol]: never }

type FilterIndex<T> = {
  [P in keyof T as string extends P
    ? never
    : number extends P
    ? never
    : P]: T[P]
}

export type DispatchFunctionsByActionOptions<A> = A extends ActionOptions
  ? FilterIndex<A> extends infer FilterA
    ? {
        [K in keyof FilterA]: FilterA[K]
      }
    : {}
  : {}

export type DispatchFuncions<S, A> = DispatchFunctionsByActionOptions<A>

export type GetState<Model> = Model extends DefineModel<
  any,
  infer S,
  any,
  any,
  any
>
  ? { [K in keyof S]: S[K] }
  : never

export type GetActions<Model> = Model extends DefineModel<
  any,
  infer S,
  infer A,
  any,
  any
>
  ? DispatchFuncions<S, A> & EmptyObject
  : never

export type Views<ViewOptions> = {
  [K in keyof ViewOptions]: ViewOptions[K] extends () => any
    ? ReturnType<ViewOptions[K]>
    : never
}

export type ActionThis<
  S extends State = {},
  A extends ActionOptions = {},
  V extends ViewOptions = {},
  D extends Deps = {}
> = {
  $state: S
  $patch: (s: StateObject) => void
} & S &
  Views<V> & {
    $dep: {
      [K in keyof D]: D[K] extends DefineModel<
        any,
        infer DS,
        infer DA,
        infer DV,
        infer DDeps
      >
        ? ActionThis<DS, DA, DV, DDeps>
        : ActionThis
    }
  } & DispatchFuncions<S, A>

export type ViewThis<
  S extends State = {},
  V extends ViewOptions = {},
  D extends Deps = {}
> = S & {
  $state: S
} & Views<V> & {
    $dep: {
      [K in keyof D]: D[K] extends DefineModel<
        any,
        infer DS,
        any,
        infer DV,
        infer DDeps
      >
        ? ViewThis<DS, DV, DDeps>
        : ActionThis
    }
  }

/**
 * If the first item is true, it means there is an error described by
 * the second item.
 */
export type Validation = [boolean | undefined, string]

/**
 * Checks if a parameter is a valid function but only when it's defined.
 * Otherwise, always returns true.
 */
export const ifDefinedIsFunction = <T>(func: T): boolean =>
  !func || typeof func === 'function'

function validateProperty(model: AnyModel, prop: keyof AnyModel, type: string) {
  const target = model[prop] as any
  if (target) {
    invariant(isPlainObject(target), `model.${prop} should be object!`)
  }
}

function checkConflictedKey(
  type: keyof AnyModel,
  obj: AnyModel,
  cache: Map<string, string>
) {
  if (!obj[type]) {
    return
  }

  for (const key of Object.keys(obj[type])) {
    if (cache.has(key)) {
      const conflictedType = cache.get(key)
      warn(
        `key "${key}" in "${type}" is conflicted with the key in "${conflictedType}"`
      )
    } else {
      cache.set(key, type)
    }
  }
}

export const validateModelOptions = (model: AnyModel): void => {
  invariant(model.hasOwnProperty('state'), 'state is required')
  invariant(
    typeof model.state !== 'bigint' && typeof model.state !== 'symbol',
    'state can not be BigInt or Symbol'
  )
  validateProperty(model, 'actions', 'object')
  validateProperty(model, 'views', 'object')

  const keys = new Map<string, string>()
  checkConflictedKey('state', model, keys)
  checkConflictedKey('views', model, keys)

  keys.clear()
  checkConflictedKey('actions', model, keys)
}
