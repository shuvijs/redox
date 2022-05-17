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

export type State = {
	[x: string]: any
	[y: number]: never
}

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

type ExtractParameterFromReducer<P extends unknown[]> = P extends []
	? never
	: P extends [p?: infer TPayload]
	? P extends [infer TPayloadMayUndefined, ...unknown[]]
		? [p: TPayloadMayUndefined]
		: [p?: TPayload]
	: never

export type ExtractRedoxDispatcherFromReducer<TState, TReducer> =
	TReducer extends () => any
		? RedoxDispatcher<false>
		: TReducer extends (state: TState, ...args: infer TRest) => TState | void
		? TRest extends []
			? RedoxDispatcher<false>
			: TRest[1] extends undefined
			? RedoxDispatcher<false, ExtractParameterFromReducer<TRest>>
			: RedoxDispatcher<false, ExtractParameterFromReducer<TRest>, never>
		: never

export type RedoxActions = {
	[x: string]: Function
}

export type Views = {
	[key: string]: Function
}

export type ModelCollection = Record<string, AnyModel>

type MiniStoreOfStoreCollection<MC extends ModelCollection> = {
	[K in keyof MC]: Store<MC[K]>
}

type StateOfStoreCollection<MC extends ModelCollection> = {
	[K in keyof MC]: MC[K]['state']
}

type ViewOfStoreCollection<MC extends ModelCollection> = {
	[K in keyof MC]: RedoxViews<MC[K]['views']>
}

type noExist = { [X: string | number | symbol]: never }

/**
 * Get the type of Dispatch
 */
export type DispatchOfModel<M> = M extends Model<
	any,
	infer S,
	any,
	infer R,
	infer RA,
	any
>
	? DispatchOfModelByProps<S, R, RA> & noExist
	: never

type DispatchOfModelByProps<S, R, RA> = DispatcherOfReducers<S, R> &
	DispatcherOfRedoxActions<RA>

export type DispatcherOfReducers<S, R> = R extends undefined
	? {}
	: FilterIndex<R> extends infer FilterR
	? {
			[K in keyof FilterR]: ExtractRedoxDispatcherFromReducer<S, FilterR[K]>
	  }
	: never

export type DispatcherOfRedoxActions<E> = E extends RedoxActions
	? FilterIndex<E> extends infer FilterE
		? {
				[K in keyof FilterE]: FilterE[K]
		  }
		: {}
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
	IsAction extends boolean,
	TReturn = any,
	TPayload = void
> = IsAction extends true ? TReturn : Action<TPayload>
/**
 * @template S State
 * @template MC dependency models
 */
export interface Model<
	N extends string,
	S extends State,
	MC extends ModelCollection,
	R extends Reducers<S>,
	RA extends RedoxActions,
	V extends Views
> {
	name?: N
	state: S
	reducers?: R
	actions?: RA &
		ThisType<
			{
				$state: () => S
				$set: (s: S) => void
				$modify: (modifier: (s: S) => void) => void
			} & RedoxViews<V> & {
					$dep: MiniStoreOfStoreCollection<MC>
				} & DispatchOfModelByProps<S, R, RA>
		>
	views?: V &
		ThisType<
			S &
				RedoxViews<V> & {
					$dep: StateOfStoreCollection<MC> & ViewOfStoreCollection<MC>
				}
		>
	_depends?: Depends
}

export type AnyModel = Model<any, any, any, any, any, any>
export type Depends = AnyModel[]

/** ************************** modal-end *************************** */

/** ************************** store-start *************************** */

export type Store<IModel extends AnyModel> = {
	$state: () => IModel['state']
	$set: (state: IModel['state']) => void
	$modify: (modifier: (state: IModel['state']) => void) => void
} & RedoxViews<IModel['views']> &
	DispatchOfModel<IModel>

export type RedoxDispatcher<
	IsAction extends boolean,
	TPayload extends [p?: unknown] = never,
	TReturn = any
> = [TPayload] extends [never]
	? () => ReturnOfDispatcher<IsAction, TReturn>
	: CheckIfParameterOptional<TPayload> extends true
	? (
			payload?: TPayload[0]
	  ) => ReturnOfDispatcher<IsAction, TReturn, TPayload[0]>
	: (payload: TPayload[0]) => ReturnOfDispatcher<IsAction, TReturn, TPayload[0]>

export type RedoxViews<V> = {
	[K in keyof V]: V[K] extends (...args: any) => any ? V[K] : never
}

/** ************************** store-end *************************** */
