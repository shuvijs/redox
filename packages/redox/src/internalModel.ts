import { produce, setAutoFreeze } from 'immer'
import {
  Action,
  State,
  Deps,
  Dispatch,
  Reducer,
  ReducerOptions,
  ActionOptions,
  ViewOptions,
  DefineModel,
  AnyModel,
  StateObject,
} from './core'
import validate from './validate'
import { emptyObject, isObject, patchObj } from './utils'

const randomString = () =>
  Math.random().toString(36).substring(7).split('').join('.')

const ActionTypes = {
  INIT: `@@redox/INIT${/* #__PURE__ */ randomString()}`,
  SET: '@@redox/SET',
  MODIFY: '@@redox/MODIFY',
  PATCH: '@@redox/PATCH',
}

export class InternalModel<IModel extends AnyModel> {
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
    if (process.env.NODE_ENV === 'development') {
      validate(() => [
        [
          typeof newState === 'bigint' || typeof newState === 'symbol',
          "'BigInt' and 'Symbol' are not assignable to the State",
        ],
      ])
    }
    return this.dispatch({
      type: ActionTypes.SET,
      payload: newState,
    })
  }

  $patch = (partState: StateObject) => {
    return this.dispatch({
      type: ActionTypes.PATCH,
      payload: function patch(state: State) {
        if (process.env.NODE_ENV === 'development') {
          validate(() => [
            [
              !isObject(partState),
              `$patch argument should be a object, but receive a ${Object.prototype.toString.call(
                partState
              )}`,
            ],
            [
              Array.isArray(state),
              `when call $patch, previous state should not be a array, but receive a ${typeof state}`,
            ],
          ])
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
        if (process.env.NODE_ENV === 'development') {
          validate(() => [
            [
              typeof modifier !== 'function',
              'Expected the param to be a Function',
            ],
          ])
        }
        modifier(state)
      },
    })
  }

  subscribe = (listener: () => void) => {
    if (process.env.NODE_ENV === 'development') {
      validate(() => [
        [
          typeof listener !== 'function',
          `Expected the listener to be a function`,
        ],
        [
          this.isDispatching,
          'You may not call store.subscribe() while the reducer is executing.',
        ],
      ])
    }

    this.listeners.add(listener)

    return () => {
      if (process.env.NODE_ENV === 'development') {
        validate(() => [
          [
            this.isDispatching,
            'You may not unsubscribe from a store listener while the reducer is executing. ',
          ],
        ])
      }

      this.listeners.delete(listener)
    }
  }

  dispatch: Dispatch = (action) => {
    if (process.env.NODE_ENV === 'development') {
      validate(() => [
        [
          typeof action.type === 'undefined',
          'Actions may not have an undefined "type" property. You may have misspelled an action type string constant.',
        ],
        [this.isDispatching, 'ReducerOptions may not dispatch actions.'],
      ])
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
