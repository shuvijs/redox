import { hasOwn, extend } from '../utils'
import { warn } from '../warning'
import { PublicPropertiesMap, ProxyContext, AccessContext } from './model'
import { AnyModel } from './defineModel'
import { State, StateObject, Actions, Views } from './modelOptions'
import { createSelector, Selector } from './modelViews'

export type ModelPublicInstance<Model extends AnyModel> = {
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

const enum AccessTypes {
  STATE,
  ACTION,
  VIEW,
  CONTEXT,
}

export const publicPropertiesMap: PublicPropertiesMap =
  // Move PURE marker to new line to workaround compiler discarding it
  // due to type annotation
  /*#__PURE__*/ extend(
    (Object.create(null),
    {
      $state: (i) => i.stateWrapper.value,
      $set: (i) => i.$set.bind(i),
      $patch: (i) => i.$patch.bind(i),
      $modify: (i) => i.$modify.bind(i),
      $actions: (i) => i.actions,
      $views: (i) => i.views,
      $createSelector: (i) => createSelector.bind(null, i),
    } as PublicPropertiesMap)
  )

export const PublicInstanceProxyHandlers = {
  get: ({ _: instance }: ProxyContext, key: string) => {
    const {
      actions,
      views,
      accessCache,
      accessContext,
      depsProxy,
      ctx,
      state,
    } = instance

    // console.log('111', key, hasOwn(views, key))
    // console.log('222', views[key])
    if (key[0] !== '$') {
      const n = accessCache[key]
      if (n !== undefined) {
        switch (n) {
          case AccessTypes.STATE:
            return state[key]
          case AccessTypes.VIEW:
            return views[key]
          case AccessTypes.ACTION:
            if (accessContext === AccessContext.VIEW) {
              return
            }
            return actions[key]
          case AccessTypes.CONTEXT:
            return ctx[key]
          // default: just fallthrough
        }
      } else if (hasOwn(state, key)) {
        accessCache[key] = AccessTypes.STATE
        return state[key]
      } else if (hasOwn(views, key)) {
        accessCache[key] = AccessTypes.VIEW
        return views[key]
      } else if (hasOwn(actions, key)) {
        if (accessContext === AccessContext.VIEW) {
          return
        }
        accessCache[key] = AccessTypes.ACTION
        return actions[key]
      } else if (hasOwn(ctx, key)) {
        accessCache[key] = AccessTypes.CONTEXT
        return ctx[key]
      }
    }

    if (key === '$dep') {
      return depsProxy
    }

    const publicGetter = publicPropertiesMap[key]
    if (publicGetter) {
      return publicGetter(instance)
    } else if (hasOwn(ctx, key)) {
      accessCache[key] = AccessTypes.CONTEXT
      return ctx[key]
    }
  },
  set({ _: instance }: ProxyContext, key: string, value: any): boolean {
    const { ctx, actions, views, accessContext } = instance

    if (accessContext === AccessContext.VIEW) {
      if (process.env.NODE_ENV === 'development') {
        warn(`Cannot change state in view function`, instance)
      }
      return false
    }

    if (hasOwn(actions, key)) {
      if (process.env.NODE_ENV === 'development') {
        warn(
          `Attempting to mutate action "${key}". Actions are readonly.`,
          instance
        )
      }
      return false
    } else if (hasOwn(views, key)) {
      if (process.env.NODE_ENV === 'development') {
        warn(
          `Attempting to mutate view "${key}". Views are readonly.`,
          instance
        )
      }
      return false
    }

    if (key[0] === '$' && hasOwn(publicPropertiesMap, key)) {
      if (process.env.NODE_ENV === 'development') {
        warn(
          `Attempting to mutate public property "${key}". ` +
            `Properties starting with $ are reserved and readonly.`,
          instance
        )
      }
      return false
    }

    ctx[key] = value
    return true
  },
}
