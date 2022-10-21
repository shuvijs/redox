import {
  reactive,
  ReactiveFlags,
  ReactiveState,
  isDraft,
  isDraftable,
} from './reactive'
import { isFrozen, hasOwn, each, set, NOOP } from '../utils'
import { Objectish } from '../types'

export type PatchPath = (string | number)[]

export function createDraft<T extends Objectish>(target: T): T {
  return reactive(target)
}

export function finishDraft(draft: any) {
  const state: ReactiveState = draft[ReactiveFlags.STATE]
  if (state.finalized) {
    throw new Error('todo')
  }

  return finalize(draft, [])
}

export function watch(draft: any, cb: () => void): () => void {
  const state: ReactiveState = draft[ReactiveFlags.STATE]
  if (state.finalized) {
    return NOOP
  }

  state.listeners.push(cb)

  return () => {
    const index = state.listeners.indexOf(cb)
    if (index >= 0) {
      state.listeners.splice(index, 1)
    }
  }
}

function finalize(value: any, path?: PatchPath) {
  if (isFrozen(value)) return value
  const state: ReactiveState = value[ReactiveFlags.STATE]
  // A plain object, might need freezing, might contain drafts
  if (!state) {
    each(
      value,
      (key, childValue) => {
        finalizeProperty(state, value, key, childValue, path)
      },
      true // See #590, don't recurse into non-enumerable of non drafted objects
    )
    return value
  }
  // Unmodified draft, return the (frozen) original
  if (!state.modified) {
    return state.base
  }
  // Not finalized yet, let's do that now
  if (!state.finalized) {
    state.finalized = true
    const result = state.copy!
    // Finalize all children of the copy
    each(result, (key, childValue) =>
      finalizeProperty(state, result, key, childValue, path)
    )
  }
  return state.copy
}

function finalizeProperty(
  parentState: undefined | ReactiveState,
  targetObject: any,
  prop: string | number,
  childValue: any,
  rootPath?: PatchPath
) {
  if (process.env.NODE_ENV === 'development' && childValue === targetObject)
    throw new Error('')

  if (isDraft(childValue)) {
    const path =
      rootPath && parentState && !hasOwn(parentState.assigned, prop) // Skip deep patches for assigned keys.
        ? rootPath!.concat(prop)
        : undefined
    const res = finalize(childValue, path)
    set(targetObject, prop, res)
    if (!isDraft(res)) {
      return
    }
  }

  // Search new objects for unfinalized drafts. Frozen objects should never contain drafts.
  if (isDraftable(childValue) && !isFrozen(childValue)) {
    finalize(childValue)
  }
}
