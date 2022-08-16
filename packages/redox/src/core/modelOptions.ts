import {
  ViewOptions,
  ReducerOptions,
  ActionOptions,
  Deps,
  AnyModel,
  DefineModel,
} from './defineModel'
import { warn } from '../warning'
import { invariant, isPlainObject } from '../utils'

type PickFirst<Arr extends unknown[]> = Arr extends [infer First, ...unknown[]]
  ? First
  : Arr extends []
  ? never
  : Arr extends [first?: infer First]
  ? First | undefined
  : never

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

type EmptyObject = { [X: string | number | symbol]: never }

export type ReducerFn<Payload = never> = [Payload] extends [never]
  ? () => Action<never>
  : [Payload] extends [optional?: infer T]
  ? (
      payload?: Exclude<T, undefined>
    ) => ActionWithPayload<Exclude<T, undefined>>
  : (payload: Payload) => ActionWithPayload<Payload>

export type GetDispatchFromReducer<State, Reducer> = Reducer extends () => any
  ? ReducerFn
  : Reducer extends (state: State, ...args: infer Args) => State | void
  ? ReducerFn<PickFirst<Args>>
  : never

type FilterIndex<T> = {
  [P in keyof T as string extends P
    ? never
    : number extends P
    ? never
    : P]: T[P]
}

export type DispatchFunctionsByReducerOptions<S, R> = R extends undefined
  ? {}
  : FilterIndex<R> extends infer FilterR
  ? {
      [K in keyof FilterR]: GetDispatchFromReducer<S, FilterR[K]>
    }
  : never

export type DispatchFunctionsByActionOptions<A> = A extends ActionOptions
  ? FilterIndex<A> extends infer FilterA
    ? {
        [K in keyof FilterA]: FilterA[K]
      }
    : {}
  : {}

export type DispatchFuncions<S, R, A> = DispatchFunctionsByReducerOptions<
  S,
  R
> &
  DispatchFunctionsByActionOptions<A>

export type Actions<Model> = Model extends DefineModel<
  any,
  infer S,
  infer R,
  infer A,
  any,
  any
>
  ? DispatchFuncions<S, R, A> & EmptyObject
  : never

export type Views<ViewOptions> = {
  [K in keyof ViewOptions]: ViewOptions[K] extends () => any
    ? ReturnType<ViewOptions[K]>
    : never
}

export type SelectorParams<Model extends AnyModel> = {
  $state: Model['state']
} & Model['state'] &
  Views<Model['views']> &
  EmptyObject

export type Selector<Model extends AnyModel, TReturn = any> = (
  stateAndViews: SelectorParams<Model>
) => TReturn

export type ModelInstance<Model extends AnyModel> = {
  $state: Model['state']
  $set: (state: State) => void
  $modify: (modifier: (state: Model['state']) => void) => void
  $patch: (partState: StateObject) => void
  $actions: Actions<Model>
  $views: Views<Model['views']>
  $createSelector: <R>(
    selector: Selector<Model, R>
  ) => (() => R) & { clearCache: () => void }
} & Views<Model['views']> &
  Actions<Model>

export type ActionThis<
  S extends State = {},
  R extends ReducerOptions<any> = {},
  A extends ActionOptions = {},
  V extends ViewOptions = {},
  D extends Deps = {}
> = {
  $state: S
  $set: (s: S) => void
  $patch: (s: StateObject) => void
  $modify: (modifier: (s: S) => void) => void
} & Views<V> & {
    $dep: {
      [K in keyof D]: D[K] extends DefineModel<
        any,
        infer DS,
        infer DR,
        infer DA,
        infer DV,
        infer DDeps
      >
        ? ActionThis<DS, DR, DA, DV, DDeps>
        : ActionThis
    }
  } & DispatchFuncions<S, R, A>

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
  validateProperty(model, 'reducers', 'object')
  validateProperty(model, 'actions', 'object')
  validateProperty(model, 'views', 'object')

  const keys = new Map<string, string>()
  checkConflictedKey('state', model, keys)
  checkConflictedKey('views', model, keys)

  keys.clear()
  checkConflictedKey('reducers', model, keys)
  checkConflictedKey('actions', model, keys)
}
