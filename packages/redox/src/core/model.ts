import {
  ViewOptions,
  ReducerOptions,
  ActionOptions,
  Deps,
  AnyModel,
  DefineModel,
} from './defineModel'

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
