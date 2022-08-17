import { produce, setAutoFreeze } from 'immer'
import {
  emptyObject,
  isPlainObject,
  patchObj,
  invariant,
  isObject,
} from '../utils'
import { warn } from '../warning'
import { readonly } from '../reactivity/reactive'
import {
  Deps,
  Reducer,
  ReducerOptions,
  ActionOptions,
  ViewOptions,
  DefineModel,
  AnyModel,
} from './defineModel'
import { Views, Actions, Action, State, StateObject } from './modelOptions'
import {
  ModelPublicInstance,
  PublicInstanceProxyHandlers,
} from './modelPublicInstance'

setAutoFreeze(false)

const randomString = () =>
  Math.random().toString(36).substring(7).split('').join('.')

const ActionTypes = {
  INIT: `@@redox/INIT${/* #__PURE__ */ randomString()}`,
  SET: '@@redox/SET',
  MODIFY: '@@redox/MODIFY',
  PATCH: '@@redox/PATCH',
}

export interface HelperActions {
  $set(newState: State): void
  $patch(newState: State): void
  $modify(fn: (state: State) => void): void
}

export type UnSubscribe = () => void

export interface Store {
  getState(): Record<string, State>
  dispatch(action: Action): Action
  subscribe(fn: () => any): UnSubscribe
  destroy(): void
}

export type Dispatch = Store['dispatch']

export type Model<IModel extends AnyModel = AnyModel> = {
  readonly name: string
  readonly options: Readonly<IModel>
  reducer: Reducer<IModel['state']>
  triggerListener(): void
} & Store &
  HelperActions

export type PublicPropertiesMap = Record<string, (i: ModelInternal) => any>

export interface ProxyContext {
  _: ModelInternal<any>
}

const DepsPublicInstanceProxyHandlers = {
  get: (deps: Map<string, ModelInternal>, key: string) => {
    const model = deps.get(key)
    if (model) {
      return model.proxy
    }

    return undefined
  },
}

export const enum AccessContext {
  DEFAULT,
  VIEW,
}

export class ModelInternal<IModel extends AnyModel = AnyModel>
  implements Model<IModel>
{
  public name: string
  public options: IModel
  public reducer: Reducer<IModel['state']>
  private _currentState: IModel['state']
  public deps: Map<string, ModelInternal>

  public ctx: Record<string, any>
  public accessCache: Record<string, any>
  // proxy for pubilc this
  public proxy: ModelPublicInstance<IModel> | null = null

  public actions: Actions<IModel>
  public views: Views<IModel['views']>
  public accessContext: AccessContext

  public depsProxy: object

  private _devReadonlyState: IModel['state'] | null
  private _listeners: Set<() => void> = new Set()
  private _isDispatching: boolean

  constructor(model: IModel, initState: State) {
    this.options = model
    this.name = this.options.name || ''
    this.reducer = createModelReducer(model)
    this._currentState = initState || model.state
    this.actions = Object.create(null)
    this.views = Object.create(null)
    this.deps = new Map()
    this.accessContext = AccessContext.DEFAULT

    this._devReadonlyState = null
    this._isDispatching = false

    this.ctx = {
      _: this,
    }
    this.accessCache = Object.create(null)
    this.proxy = new Proxy(
      this.ctx,
      PublicInstanceProxyHandlers
    ) as ModelPublicInstance<IModel>

    this.depsProxy = new Proxy(this.deps, DepsPublicInstanceProxyHandlers)

    this._initActions()

    this.dispatch({ type: ActionTypes.INIT })
  }

  $set(newState: State) {
    invariant(
      typeof newState !== 'bigint' && typeof newState !== 'symbol',
      "'BigInt' and 'Symbol' are not assignable to the State"
    )

    this.dispatch({
      type: ActionTypes.SET,
      payload: newState,
    })
  }

  $patch(partState: StateObject) {
    this.dispatch({
      type: ActionTypes.PATCH,
      payload: function patch(state: State) {
        if (!isPlainObject(partState)) {
          if (process.env.NODE_ENV === 'development') {
            warn(
              `$patch argument should be an object, but receive a ${Object.prototype.toString.call(
                partState
              )}`
            )
          }
          return
        }

        if (!state) {
          return partState
        }

        patchObj(state as StateObject, partState)
        return
      },
    })
  }

  $modify(modifier: (state: State) => void) {
    this.dispatch({
      type: ActionTypes.MODIFY,
      payload: function modify(state: State) {
        modifier(state)
      },
    })
  }

  getState() {
    if (
      process.env.NODE_ENV === 'development' &&
      isObject(this._currentState)
    ) {
      if (this._devReadonlyState === null) {
        this._devReadonlyState = readonly<{}>(this._currentState)
      }

      return this._devReadonlyState
    }

    return this._currentState!
  }

  dispatch(action: Action) {
    if (typeof action.type === 'undefined') {
      if (process.env.NODE_ENV === 'development') {
        warn(
          `Actions may not have an undefined "type" property. You may have misspelled an action type string constant.`
        )
      }
      return action
    }

    if (this._isDispatching) {
      if (process.env.NODE_ENV === 'development') {
        warn(`Cannot dispatch action from a reducer.`)
      }
      return action
    }

    let nextState

    try {
      this._isDispatching = true
      nextState = this.reducer(this._currentState, action)
    } finally {
      this._isDispatching = false
    }

    if (nextState !== this._currentState) {
      this._currentState = nextState
      if (process.env.NODE_ENV === 'development') {
        this._devReadonlyState = null
      }
      // trigger self _listeners
      this.triggerListener()
    }

    return action
  }

  subscribe(listener: () => void) {
    this._listeners.add(listener)

    return () => {
      this._listeners.delete(listener)
    }
  }

  destroy() {
    this._currentState = null
    this.reducer = () => {}
    this._listeners.clear()
    this.options = emptyObject
  }

  triggerListener() {
    for (const listener of this._listeners) {
      listener()
    }
  }

  private _initActions() {
    // map reducer names to dispatch actions
    const reducers = this.options.reducers
    if (reducers) {
      const reducersKeys = Object.keys(reducers)
      reducersKeys.forEach((reducerName) => {
        // @ts-ignore
        this.actions[reducerName] = (payload?: any): Action => {
          const action: Action = { type: reducerName }

          if (typeof payload !== 'undefined') {
            action.payload = payload
          }

          return this.dispatch(action)
        }
      })
    }

    // map actions names to dispatch actions
    const actions = this.options.actions
    if (actions) {
      const actionKeys = Object.keys(actions)
      actionKeys.forEach((actionsName) => {
        const action = actions[actionsName]
        // @ts-ignore
        this.actions[actionsName as string] = (...args: any[]) => {
          return action.call(this.proxy, ...args)
        }
      })
    }
  }
}

export function createModelInstnace<IModel extends AnyModel>(
  modelOptions: IModel,
  initState: State
) {
  return new ModelInternal<IModel>(modelOptions, initState)
}

function createModelReducer<
  N extends string,
  S extends State,
  R extends ReducerOptions<S>,
  A extends ActionOptions,
  V extends ViewOptions,
  D extends Deps
>(model: DefineModel<N, S, R, A, V, D>): Reducer<S> {
  // select and run a reducer based on the incoming action
  return (state: S = model.state, action: Action): S => {
    if (action.type === ActionTypes.SET) {
      return action.payload
    }

    let reducer = model.reducers?.[action.type]

    if (
      action.type === ActionTypes.MODIFY ||
      action.type === ActionTypes.PATCH
    ) {
      reducer = action.payload
    }

    if (typeof reducer === 'function') {
      // immer does not support 'undefined' state
      if (state === undefined) return reducer(state, action.payload) as S
      return produce(
        state,
        (draft: any) => reducer!(draft, action.payload) as S
      )
    }

    return state
  }
}
