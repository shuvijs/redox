import type {
  RedoxStore,
  ModelPublicInstance,
  AnyModel,
  Selector,
  SelectorParams,
} from '@shuvi/redox'

function tuplify<T extends any[]>(...elements: T) {
  return elements
}

function updateProxy<IModel extends AnyModel>(
  store: ModelPublicInstance<IModel>
) {
  const tempProxy = { $state: store.$state } as SelectorParams<IModel>
  Object.assign(tempProxy, store.$state, store.$views)
  ;(
    store as ModelPublicInstance<IModel> & {
      __proxy: SelectorParams<IModel>
    }
  ).__proxy = new Proxy(tempProxy, {
    get(target: any, p: string | symbol): any {
      let result = target[p]

      // OwnProperty function should be $state and view
      if (typeof result === 'function' && target.hasOwnProperty(p)) {
        const view = result
        // call view fn
        let res = view()
        // cache view result
        target[p] = res
        return res
      }

      return result
    },
    set() {
      if (process.env.NODE_ENV === 'development') {
        console.error(`not allow change any thing !`)
      }
      return false
    },
  })
}

function getStateActions<M extends AnyModel, S extends Selector<M>>(
  model: M,
  redoxStore: RedoxStore,
  selector?: () => ReturnType<S>
) {
  const store = redoxStore.getModel(model)
  let state: SelectorParams<M> | ReturnType<S>
  if (!selector) {
    if (!store.__proxy) {
      updateProxy(store)
      redoxStore.subscribe(model, function () {
        updateProxy(store)
      })
    }
    state = store.__proxy as SelectorParams<M>
  } else {
    state = selector()
  }
  return tuplify(state, store.$actions)
}

export { getStateActions }
