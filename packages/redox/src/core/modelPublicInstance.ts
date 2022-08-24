import { hasOwn, extend, isPlainObject } from '../utils'
import { warn } from '../warning'
import {
  PublicPropertiesMap,
  ProxyContext,
  AccessContext,
  onViewInvalidate,
} from './model'
import { AnyModel } from './defineModel'
import { State, Actions, Views } from './modelOptions'
import { createView, Selector, ModelView, ModelSnapshot } from './modelViews'

export type ModelPublicInstance<IModel extends AnyModel> = {
  $state: IModel['state']
  $set(newState: State): void
  $patch(newState: State): void
  $modify(fn: (state: IModel['state']) => void): void
  $actions: Actions<IModel>
  $views: Views<IModel['views']>
  $getSnapshot(): ModelSnapshot<IModel>
  $createSelector: <R>(
    selector: Selector<IModel, R>,
    onInvalidate?: onViewInvalidate
  ) => ModelView<Selector<IModel, R>>
} & IModel['state'] &
  Views<IModel['views']> &
  Actions<IModel>

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
      $set: (i) => i.set,
      $patch: (i) => i.patch,
      $modify: (i) => i.modify,
      $actions: (i) => i.actions,
      $views: (i) => i.views,
      $getSnapshot: (i) => i.getSnapshot,
      $createSelector: (i) => createView.bind(null, i),
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
    // fallback to state, the key may not exist at first
    else if (isPlainObject(state)) {
      // @ts-ignore
      return state[key]
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
