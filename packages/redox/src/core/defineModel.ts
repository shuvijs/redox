import {
  State,
  Action,
  ActionThis,
  ViewThis,
  validateModelOptions,
} from './modelOptions'
import { invariant } from '../utils'

export type Reducer<S extends State> = (
  state: S,
  payload?: Action['payload']
) => S | void

export type ReducerOptions<S = {}> = Record<string, Reducer<S>>

export type ActionOptions = Record<string, Function>

export type ViewOptions = Record<string, Function>

export type ModelViews<V> = {
  [K in keyof V]: V[K] extends () => any ? ReturnType<V[K]> : never
}

export type AnyModel = DefineModel<any, any, any, any, any, any>

export type Deps = Record<string, AnyModel>

/**
 * @template S State
 * @template MC dependency models
 */
export type DefineModel<
  N extends string,
  S extends State,
  R extends ReducerOptions<S>,
  A extends ActionOptions,
  V extends ViewOptions,
  D extends Deps
> = {
  name?: N
  state: S
  reducers?: R
  actions?: A & ThisType<ActionThis<S, R, A, V, D>>
  views?: V & ThisType<ViewThis<S, V, D>>
  _depends?: Deps
}

export type Tuple<T> = T extends [any, ...any] ? T : []

type ToDep<T> = T extends DefineModel<infer _N, any, any, any, any, any>
  ? T
  : never

export type GetModelName<T> = T extends DefineModel<
  infer Name,
  any,
  any,
  any,
  any,
  any
>
  ? Name
  : never

export type GetModelDeps<T> = T extends DefineModel<
  any,
  any,
  any,
  any,
  any,
  infer Deps
>
  ? Deps
  : never

// transform depends start
namespace M {
  export type Num<T> = Extract<T, number>
  type Length<T extends any[]> = T['length']
  type Push<T extends any[], Val> = [...T, Val]
  export type NTuple<
    N extends number,
    T extends any[] = []
  > = T['length'] extends N ? T : NTuple<N, Push<T, any>>

  export type Add<A extends number, B extends number> = Length<
    [...NTuple<A>, ...NTuple<B>]
  >
  export type Sub<A extends number, B extends number> = NTuple<A> extends [
    ...infer U,
    ...NTuple<B>
  ]
    ? Length<U>
    : never
}

export type MakeDeps<
  T extends any[],
  L extends number = T['length'],
  Dep extends {} = {},
  N extends 1[] = []
> = L extends 0
  ? Dep
  : L extends 1
  ? Dep &
      {
        [K in GetModelName<T[0]> extends `${infer isString}`
          ? `${isString}`
          : `${N['length']}`]: ToDep<T[0]>
      } &
      GetModelDeps<T[0]>
  : T extends [infer First, ...infer Rest]
  ? MakeDeps<
      Rest,
      M.Sub<L, 1>,
      Dep &
        {
          [K in GetModelName<First> extends `${infer isString}`
            ? `${isString}`
            : `${N['length']}`]: ToDep<First>
        } &
        GetModelDeps<First>,
      [...N, 1]
    >
  : never

export const defineModel = <
  N extends string,
  S extends State,
  R extends ReducerOptions<S>,
  A extends ActionOptions,
  V extends ViewOptions,
  Deps extends MakeDeps<D>,
  D extends any[] = []
>(
  modelOptions: Omit<DefineModel<N, S, R, A, V, Deps>, '_depends'>,
  depends?: Tuple<D>
) => {
  if (process.env.NODE_ENV === 'development') {
    invariant(
      !depends || Array.isArray(depends),
      `second argument depends should be an array, now is ${typeof depends} !`
    )
    validateModelOptions(modelOptions)
  }

  const model = modelOptions as DefineModel<N, S, R, A, V, Deps>
  if (depends) {
    model._depends = {}
    for (let index = 0; index < depends.length; index++) {
      const dep = depends[index] as AnyModel
      const name: string = dep.name || `${index}`
      model._depends[name] = dep
    }
  }

  return model
}
