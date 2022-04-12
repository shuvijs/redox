type CheckIfParameterOptional<P> = P extends [unknown, ...unknown[]]
	? false
	: true

type Without<FirstType, SecondType> = {
	[KeyType in Exclude<keyof FirstType, keyof SecondType>]: never
}
export type MergeExclusive<FirstType, SecondType> =
	| FirstType
	| SecondType extends object
	?
			| (Without<FirstType, SecondType> & SecondType)
			| (Without<SecondType, FirstType> & FirstType)
	: FirstType | SecondType

/** ************************** redux-start *************************** */

interface ReduxAction<T = string> {
	type: T
}

export interface AnyAction extends ReduxAction {
	// Allows any extra properties to be defined in an action.
	[extraProps: string]: any
}

export type ReduxReducer<S = any, A extends ReduxAction = AnyAction> = (
	state: S | undefined,
	action: A
) => S

export interface ReduxDispatch<A extends ReduxAction = AnyAction> {
	<T extends A>(action: T): T
}

/** ************************** redux-end *************************** */

/** ************************** modal-start *************************** */

export type State = Record<string, any>
export interface Action<TPayload = any> extends ReduxAction<string> {
	payload?: TPayload
}

type Reducer<S extends State> = (
	state: S,
	payload?: Action['payload']
) => S | void

export type Reducers<S extends State> = {
	[x: string]: Reducer<S>
}

type ExtractParameterFromReducer<
	P extends unknown[],
	V extends 'payload'
> = P extends []
	? never
	: P extends [p?: infer TPayload]
	? V extends 'payload'
		? P extends [infer TPayloadMayUndefined, ...unknown[]]
			? [p: TPayloadMayUndefined]
			: [p?: TPayload]
		: never
	: never

export type ExtractRedoxDispatcherFromReducer<TState, TReducer> =
	TReducer extends () => any
		? RedoxDispatcher<false>
		: TReducer extends (state: TState, ...args: infer TRest) => TState | void
		? TRest extends []
			? RedoxDispatcher<false>
			: TRest[1] extends undefined
			? RedoxDispatcher<false, ExtractParameterFromReducer<TRest, 'payload'>>
			: RedoxDispatcher<
					false,
					ExtractParameterFromReducer<TRest, 'payload'>,
					never
			  >
		: never

export type Effect<
	S extends State,
	_R extends Reducers<S>,
	RM extends ModelCollection,
	Payload = any
> = (
	payload: Action<Payload>['payload'],
	state: S,
	depends: MiniStoreOfStoreCollection<RM>
) => any

export type Effects<
	S extends State,
	R extends Reducers<S>,
	RM extends ModelCollection
> = {
	[x: string]: Effect<S, R, RM>
}

type ExtractRedoxDispatcherFromEffect<TEffect extends Effect<any, any, any>> =
	TEffect extends (...args: infer TRest) => infer TReturn
		? TRest extends []
			? RedoxDispatcher<true, never, never, TReturn>
			: TRest[1] extends undefined
			? RedoxDispatcher<
					true,
					ExtractParameterFromEffect<TRest, 'payload'>,
					never,
					TReturn
			  >
			: TRest[2] extends undefined
			? RedoxDispatcher<
					true,
					ExtractParameterFromEffect<TRest, 'payload'>,
					never,
					TReturn
			  >
			: RedoxDispatcher<
					true,
					ExtractParameterFromEffect<TRest, 'payload'>,
					never,
					TReturn
			  >
		: never

type ExtractParameterFromEffect<
	P extends unknown[],
	V extends 'payload'
> = P extends []
	? never
	: P extends [p?: infer TPayload, s?: unknown, r?: unknown]
	? V extends 'payload'
		? P extends [infer TPayloadMayUndefined, ...unknown[]]
			? [p: TPayloadMayUndefined]
			: [p?: TPayload]
		: never
	: P extends [
			p?: infer TPayload,
			s?: unknown,
			r?: unknown,
			m?: infer TMeta,
			...args: unknown[]
	  ]
	? V extends 'payload'
		? P extends [infer TPayloadMayUndefined, ...unknown[]]
			? [p: TPayloadMayUndefined]
			: [p?: TPayload]
		: P extends [
				unknown,
				unknown,
				unknown,
				infer TMetaMayUndefined,
				...unknown[]
		  ]
		? [m: TMetaMayUndefined]
		: [m?: TMeta]
	: never

type View<S, RM extends ModelCollection> = (
	state: S,
	rootState: StateOfStoreCollection<RM>,
	args: any
) => unknown

export type Views<S, RM extends ModelCollection> = {
	[key: string]: View<S, RM>
}

export type ModelCollection = Record<string, AnyModel>

type MiniStoreOfStoreCollection<MC extends ModelCollection> = {
	getState: () => StateOfStoreCollection<MC>
	dispatch: DispatchOfModelCollection<MC>
}

type StateOfStoreCollection<MC extends ModelCollection> = {
	[K in keyof MC]: MC[K]['state']
}

export type DispatchOfModelCollection<MC extends ModelCollection> = {
	[K in keyof MC]: DispatchOfModel<MC[K]>
}

type RedoxDispatch<IModel extends AnyModel> = ReduxDispatch &
	DispatchOfModel<IModel>

/**
 * Get the type of Dispatch
 */
type DispatchOfModel<M> = M extends Model<
	any,
	infer S,
	any,
	infer R,
	infer E,
	any
>
	? DispatchOfModelByProps<S, R, E>
	: never

export type DispatchOfModelByProps<S, R, E> = ReduxDispatch &
	DispatcherOfReducers<S, R> &
	DispatcherOfEffects<E> & { [X: string | number | symbol]: never }

type DispatcherOfReducers<S, R> = R extends undefined
	? {}
	: FilterIndex<R> extends infer FilterR
	? {
			[K in keyof FilterR]: ExtractRedoxDispatcherFromReducer<S, FilterR[K]>
	  }
	: never

type DispatcherOfEffects<E> = E extends undefined
	? {}
	: FilterIndex<E> extends infer FilterE
	? {
			[K in keyof FilterE]: FilterE[K] extends Effect<any, any, any>
				? ExtractRedoxDispatcherFromEffect<FilterE[K]>
				: never
	  }
	: {}

type FilterIndex<T> = {
	[P in keyof T as string extends P
		? never
		: number extends P
		? never
		: P]: T[P]
}

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

type ToDep<T> = T extends Model<infer _N, any, any, any, any, any> ? T : never

type GetModelName<T> = T extends Model<infer N, any, any, any, any, any>
	? N
	: never
type GetModelDeps<T> = T extends Model<any, any, infer MC, any, any, any>
	? MC
	: never

export type MakeDeps<
	T extends any[],
	L extends number = T['length'],
	Dep extends {} = {}
> = L extends 0
	? Dep
	: L extends 1
	? Dep &
			{
				[K in GetModelName<T[0]>]: ToDep<T[0]>
			} &
			GetModelDeps<T[0]>
	: T extends [infer First, ...infer Rest]
	? MakeDeps<
			Rest,
			M.Sub<L, 1>,
			Dep &
				{
					[K in GetModelName<First>]: ToDep<First>
				} &
				GetModelDeps<First>
	  >
	: never

export type Tuple<T> = T extends [any, ...any] ? T : []

// transform depends end

/**
 * Get return type of redox dispatcher
 */
type ReturnOfDispatcher<
	IsEffect extends boolean,
	TReturn = any,
	TPayload = void
> = IsEffect extends true ? TReturn : Action<TPayload>
/**
 * @template S State
 * @template MC dependency models
 */
export interface Model<
	N extends string,
	S extends State,
	MC extends ModelCollection,
	R extends Reducers<S>,
	E extends Effects<S, R, MC>,
	V extends Views<S, MC>
> {
	name: N
	state: S
	reducers: R
	effects?: E & ThisType<DispatchOfModelByProps<S, R, E>>
	views?: V & ThisType<ViewsObj<V>>
	_depends?: Depends
}

type ViewsObj<V> = V extends Views<any, any>
	? { [K in keyof V]: ReturnType<V[K]> }
	: {}

export type AnyModel = Model<any, any, any, any, any, any>
export type Depends = AnyModel[]

/** ************************** modal-end *************************** */

/** ************************** store-start *************************** */

export interface Store<IModel extends AnyModel> {
	name: string
	getState(): IModel['state']
	dispatch: RedoxDispatch<IModel>
	subscribe(listener: () => void): unSubscribe
	destroy: () => void
	views: RedoxViews<IModel>
	_triggerListener: () => void
	_beDepends: Set<Store<any>>
}
type unSubscribe = () => void

export type RedoxDispatcher<
	IsEffect extends boolean,
	TPayload extends [p?: unknown] = never,
	TMeta extends [m?: unknown] = never,
	TReturn = any
> = [TPayload, TMeta] extends [never, never]
	? (() => ReturnOfDispatcher<IsEffect, TReturn>) & { isEffect: IsEffect }
	: [TMeta] extends [never]
	? CheckIfParameterOptional<TPayload> extends true
		? ((
				payload?: TPayload[0]
		  ) => ReturnOfDispatcher<IsEffect, TReturn, TPayload[0]>) & {
				isEffect: IsEffect
		  }
		: ((
				payload: TPayload[0]
		  ) => ReturnOfDispatcher<IsEffect, TReturn, TPayload[0]>) & {
				isEffect: IsEffect
		  }
	: CheckIfParameterOptional<TMeta> extends true
	? CheckIfParameterOptional<TPayload> extends true
		? ((
				payload?: TPayload[0]
		  ) => ReturnOfDispatcher<IsEffect, TReturn, TPayload[0]>) & {
				isEffect: IsEffect
		  }
		: ((
				payload: TPayload[0]
		  ) => ReturnOfDispatcher<IsEffect, TReturn, TPayload[0]>) & {
				isEffect: IsEffect
		  }
	: ((
			payload: TPayload[0]
	  ) => ReturnOfDispatcher<IsEffect, TReturn, TPayload[0]>) & {
			isEffect: IsEffect
	  }

type RedoxViews<IModel extends AnyModel> = IModel extends Model<
	any,
	any,
	any,
	any,
	any,
	infer V
>
	? V extends undefined
		? never
		: FilterIndex<V> extends infer FilterV
		? keyof FilterV extends never
			? never
			: {
					[K in keyof FilterV]: ExtractParameterFromViews<FilterV[K]>
			  }
		: never
	: never

type ExtractParameterFromViews<TView> = TView extends (
	...args: infer TArgs
) => infer TReturn
	? TArgs extends []
		? () => TReturn
		: TArgs[2] extends undefined
		? () => TReturn
		: TArgs extends [p0: any, p1: any, P2: any]
		? (arg: TArgs[2]) => TReturn
		: (
				arg?: TArgs[2] extends undefined
					? TArgs[2]
					: Exclude<TArgs[2], undefined>
		  ) => TReturn
	: never

/** ************************** store-end *************************** */
