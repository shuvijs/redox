import { produce, setAutoFreeze } from 'immer'
import {
  Deps,
  Reducer,
  ReducerOptions,
  ActionOptions,
  ViewOptions,
  DefineModel,
  AnyModel,
} from './defineModel'
import { Action, State, StateObject } from './modelOptions'
import { emptyObject, isPlainObject, patchObj, invariant } from '../utils'
import { warn } from '../warning'

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

export type Model<ModelOptions extends AnyModel = AnyModel> = {
  readonly name: string
  readonly options: Readonly<ModelOptions>
  reducer: Reducer<ModelOptions['state']>
  triggerListener(): void
} & Store &
  HelperActions

class ModelImpl<ModelOptions extends AnyModel> implements Model<ModelOptions> {
  public name: string
  public options: ModelOptions
  public reducer: Reducer<ModelOptions['state']>

  private _currentState: ModelOptions['state']
  private _listeners: Set<() => void> = new Set()
  private _isDispatching: boolean

  constructor(model: ModelOptions, initState: State) {
    this.options = model
    this.name = this.options.name || ''
    this.reducer = createModelReducer(model)
    this._currentState = initState || model.state
    this._isDispatching = false

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
}

export function createModelInstnace<ModelOptions extends AnyModel>(
  modelOptions: ModelOptions,
  initState: State
) {
  return new ModelImpl<ModelOptions>(modelOptions, initState)
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
