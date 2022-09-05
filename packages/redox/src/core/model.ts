import { produce } from '../reactivity/producer'
import { isPlainObject, patchObj, invariant, isObject } from '../utils'
import { warn } from '../warning'
import {
  reactive,
  readonly,
  view as reactiveView,
  View,
  effectScope,
  EffectScope,
  onViewInvalidate,
  isReactive,
} from '../reactivity'
import { AnyModel } from './defineModel'
import { Views, Actions, Action, State, StateObject } from './modelOptions'
import {
  ModelPublicInstance,
  PublicInstanceProxyHandlers,
} from './modelPublicInstance'

export { onViewInvalidate }

const randomString = () =>
  Math.random().toString(36).substring(7).split('').join('.')

const ActionTypes = {
  INIT: `@@redox/INIT${/* #__PURE__ */ randomString()}`,
  SET: '@@redox/SET',
  MODIFY: '@@redox/MODIFY',
  PATCH: '@@redox/PATCH',
}

export type UnSubscribe = () => void

export interface Store {
  getState(): Record<string, State>
  dispatch(action: Action): Action
  subscribe(fn: () => any): UnSubscribe
  destroy(): void
}

export type Dispatch = Store['dispatch']

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

export class ModelInternal<IModel extends AnyModel = AnyModel> {
  name: string
  options: IModel

  // deps
  deps: Map<string, ModelInternal>
  depsProxy: object

  ctx: Record<string, any>
  accessCache: Record<string, any>

  /**
   * proxy for public this
   */
  proxy: ModelPublicInstance<IModel> | null = null

  // props
  actions: Actions<IModel>
  views: Views<IModel['views']>
  accessContext: AccessContext

  // state
  state!: IModel['state']
  stateWrapper!: {
    value: IModel['state']
  }
  effectScope: EffectScope

  private _snapshot: State | null
  private _currentState: IModel['state']
  private _listeners: Set<() => void> = new Set()
  private _isDispatching: boolean

  constructor(model: IModel, initState: State) {
    this.set = this.set.bind(this)
    this.patch = this.patch.bind(this)
    this.modify = this.modify.bind(this)
    this.getSnapshot = this.getSnapshot.bind(this)
    this.subscribe = this.subscribe.bind(this)
    this.reducer = this.reducer.bind(this)

    this.options = model
    this.name = this.options.name || ''
    this._currentState = initState || model.state
    this._afterStateUpdate()
    this.actions = Object.create(null)
    this.views = Object.create(null)
    this.deps = new Map()
    this.accessContext = AccessContext.DEFAULT

    this._isDispatching = false
    this.effectScope = effectScope()

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
    this._initViews()

    this.dispatch({ type: ActionTypes.INIT })
  }

  set(newState: State) {
    invariant(
      typeof newState !== 'bigint' && typeof newState !== 'symbol',
      "'BigInt' and 'Symbol' are not assignable to the State"
    )

    this.dispatch({
      type: ActionTypes.SET,
      payload: newState,
    })
  }

  patch(partState: StateObject) {
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

  modify(modifier: (state: State) => void) {
    this.dispatch({
      type: ActionTypes.MODIFY,
      payload: function modify(state: State) {
        modifier(state)
      },
    })
  }

  getState() {
    return this.state
  }

  getSnapshot() {
    if (this._snapshot === null) {
      this._snapshot = {
        $state: this._currentState,
        ...this.state,
        ...this.views,
      }
    }

    return this._snapshot
  }

  reducer(state: IModel['state'], action: Action) {
    if (action.type === ActionTypes.SET) {
      return action.payload
    }

    let reducer = this.options.reducers?.[action.type]

    if (
      action.type === ActionTypes.MODIFY ||
      action.type === ActionTypes.PATCH
    ) {
      reducer = action.payload
    }

    if (typeof reducer === 'function') {
      // immer does not support 'undefined' state
      if (state === undefined)
        return reducer(state, action.payload) as IModel['state']
      return produce(
        isReactive(this.state)
          ? this.state
          : isObject(this.state)
          ? reactive(this.state)
          : this.state,
        (draft: any) => reducer!(draft, action.payload) as IModel['state']
      )
    }

    return state
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
      this._afterStateUpdate()
      // trigger self _listeners
      this._triggerListener()
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
    this.stateWrapper = {
      value: null,
    }
    this._listeners.clear()
    this.effectScope.stop()
  }

  depend(name: string, dep: ModelInternal<any>) {
    this.deps.set(name, dep)
    // collection beDepends, a depends b, when b update, call a need trigger listener
    dep.subscribe(() => {
      this._triggerListener()
    })
  }

  private _triggerListener() {
    for (const listener of this._listeners) {
      listener()
    }
  }

  createView(viewFn: () => any, onInvalidate?: onViewInvalidate) {
    let view: View
    this.effectScope.run(() => {
      view = reactiveView(() => {
        const oldCtx = this.accessContext
        this.accessContext = AccessContext.VIEW
        try {
          return viewFn.call(this.proxy)
        } finally {
          this.accessContext = oldCtx
        }
      }, onInvalidate)
    })

    return view!
  }

  private _afterStateUpdate() {
    this._snapshot = null
    if (isPlainObject(this._currentState)) {
      this.state = reactive({ ...this._currentState }, () => this._currentState)
    } else {
      this.state = this._currentState
    }

    // state ref should be readonly
    this.stateWrapper = readonly(
      reactive(() => ({
        value: this._currentState,
      }))
    )
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

  private _initViews() {
    const views = this.options.views
    if (views) {
      for (const viewName of Object.keys(views)) {
        const viewFn = views[viewName]
        const view = this.createView(viewFn)

        Object.defineProperty(this.views, viewName, {
          configurable: true,
          enumerable: true,
          get() {
            return view.value
          },
          set() {
            if (process.env.NODE_ENV === 'development') {
              warn(`cannot change view property '${String(viewName)}'`)
            }
            return false
          },
        })
      }
    }
  }
}

export function createModelInstnace<IModel extends AnyModel>(
  modelOptions: IModel,
  initState: State
) {
  return new ModelInternal<IModel>(modelOptions, initState)
}
