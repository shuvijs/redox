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

export type Dispatch = (action: Action) => Action

const randomString = () =>
  Math.random().toString(36).substring(7).split('').join('.')

const ActionTypes = {
  INIT: `@@redox/INIT${/* #__PURE__ */ randomString()}`,
  SET: '@@redox/SET',
  MODIFY: '@@redox/MODIFY',
  PATCH: '@@redox/PATCH',
}

export class Model<IModel extends AnyModel> {
  public name: Readonly<string>
  public model: Readonly<IModel>
  public reducer: Reducer<IModel['state']>

  private currentState: IModel['state']
  private listeners: Set<() => void> = new Set()
  private isDispatching: boolean

  constructor(model: IModel, initState: State) {
    this.model = model
    this.name = this.model.name || ''
    this.reducer = createModelReducer(model)
    this.currentState = initState || model.state
    this.isDispatching = false

    this.dispatch({ type: ActionTypes.INIT })
  }

  getState = () => {
    return this.currentState!
  }

  $set = (newState: State) => {
    invariant(
      typeof newState !== 'bigint' && typeof newState !== 'symbol',
      "'BigInt' and 'Symbol' are not assignable to the State"
    )

    return this.dispatch({
      type: ActionTypes.SET,
      payload: newState,
    })
  }

  $patch = (partState: StateObject) => {
    return this.dispatch({
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

  $modify = (modifier: (state: State) => void) => {
    return this.dispatch({
      type: ActionTypes.MODIFY,
      payload: function modify(state: State) {
        modifier(state)
      },
    })
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)

    return () => {
      this.listeners.delete(listener)
    }
  }

  dispatch: Dispatch = (action) => {
    if (typeof action.type === 'undefined') {
      if (process.env.NODE_ENV === 'development') {
        warn(
          `Actions may not have an undefined "type" property. You may have misspelled an action type string constant.`
        )
      }
      return action
    }

    if (this.isDispatching) {
      if (process.env.NODE_ENV === 'development') {
        warn(`Cannot dispatch action from a reducer.`)
      }
      return action
    }

    let nextState

    try {
      this.isDispatching = true
      nextState = this.reducer(this.currentState, action)
    } finally {
      this.isDispatching = false
    }

    if (nextState !== this.currentState) {
      this.currentState = nextState
      // trigger self listeners
      this.triggerListener()
    }

    return action
  }

  triggerListener = () => {
    for (const listener of this.listeners) {
      listener()
    }
  }

  destroy = () => {
    this.currentState = null
    this.reducer = () => {}
    this.listeners.clear()
    this.model = emptyObject
  }
}

setAutoFreeze(false)

export function createModelReducer<
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
