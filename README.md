<div align="center">
<h1>redox-react</h1>
</div>

Redox-react is a decentralized store management solution base on redox, All stores do not need to be initialized at the very beginning, but will only be initialized when it needed.

1. It is tiny, after gzip redox/2kB，redox-react/1kB, support esmodule and treeShaking.

2. There is a subscription relationship between the model and the components that subscribe to it. If the state changes, only the components that subscribe to it will be rendered.

3. In the same component, regardless of whether it is in the same context, the any data changes are triggered at the same time, and only rendered once

4. Based on TS writing, TS type hints are very friendly

5. Keep state status when [hmr](https://webpack.js.org/concepts/hot-module-replacement/)

1. SSR supported very well

<hr />

## producer consumer model

  - **producer** is `defineModel`
    The model like react component, which can be run separately or combined through the second parameter `depend`
  - **consumer** is `usexxModel` eg `useModel` `useGlobalModel` `useSharedModel` `useStaticModel`
    xxModel consumes the model in the Provider context, and only creates the store when it is called.

## `defineModel`

  strongly typed supported.

- first params is **model** self
  - name*
    name is necessary and should be unique
  - reducers*
    - is the reducer concept of Redux
    - [immer](https://github.com/immerjs/immer) support by default
  - effects?
    some effects functions, like fetch data
  - views?
    define view by property, when a view been called, it will collect dependencies with automatic. if depends on changes, view return value with cache.

- second option params depends

    depends should be the value defineModel returned. if a model is depends other model, it is very useful. eg: depends isLogin status.


```ts
import { defineModel } from '@shuvi/redox'

const count = defineModel({
    name: 'count', // necessary and should be unique
    state: { value: 0 },
    // concept of Redux
    reducers: {
        add: (state, payload: number) => {
            return {
                value: state.value + payload,
            }
        },
    },
    effects: {
        // some effects method
        async addAsync(payload: number, _state) {
            await delay(payload) // may be await some async method
            this.increment(1) // this point reducers
        },
    },
})
```

```ts
const user = defineModel(
  {
    name: 'user',
    state: {
      id: 1,
      name: 'user'
    },
    reducers: {
      add: (state, step) => {
        return {
          ...state,
          id: state.id + step
        };
      }
    },
    effects: {
      async depends(selfArg0: string, selfArg1: number, selfArg2: any) {
        // get current state
        const state = this.$state()
        // call self effect
        await this.anyMethod(1)
        // get depends state
        const countState = this.$dep.count.$state()
        // trigger depends actions
        this.$dep.count.add(1)
        this.$dep.count.addAsync(1)
      }
      async anyMethod(n:number){
        // call self reducer
        this.add(n)
      }
    },
    views: {
      viewCount (state, dependsState){
        // dependsState point depends state collection
        return dependsState.count.value;
      },
      anyView (state, _dependsState, args: number {
          // args allow custom args
          // this point views self
        return this.viewCount + state.id;
      }
    }
  },
  [ count ] // defined depends
);
```

> `this` in `Effects` and `views` can be accessed to itself, `ts` automatically infers the type, and when there is an error in the type related to `this` returned, it can actively mark the type

## `usexxModel`

### selector

`usexxModel`, first param is `model`, second optional param is `selector`.

`selector` selects the state what the react component needed, and purpose is to reduce render times.

> `ISelector` is typescript tips for create selector.

```ts
import type { ISelectorParams } from '@shuvi/redox-react'
const selector= function (stateAndViews: ISelectorParams<typeof user>) {
  return {
    stateData: stateAndViews.id,
    double: stateAndViews.anyView(3),
    d: stateAndViews.viewCount()
  };
};
```
```ts
const [views, actions] = useModel(user, selector);
```

### `useModel`

Always completely separate context

### `useGlobalModel`

Global `Provider` context, you can get the global context anywhere, even if the component is unmount, the state will not be destroyed.

### `useSharedModel`

In the same `Provider` context, share the state of the store

`createContainer` return a independent scope `Provider, useSharedModel, useStaticModel` for context and methods to consume models.

```ts
const { Provider, useModel, useStaticModel } = createContainer();
```

All the models in same `Provider` can be shared by each other. `useModel, useStaticModel` for consume models.

> `Provider` accepts props modelManager, there is way to connect to different independent context by shared with same modelManager call `redox()`

### `useStaticModel`

`useStaticModel` is similar to `useSharedModel` adn `useGlobalModel`, the different is that, `useStaticModel` will not rerender on state changed.

> `useStaticModel` not support [Destructuring Assignment](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment). no error eg `const [state, _] = useStaticModel(model)`

## modelManager

### Store
  return by modelManager.get(model), Store contains keys of reducers, effects and views.
  - $state
    return state of store
  - subscribe
    trigger subscribe functions called when state changed, if there is depends relationship between models, beDepend model subscribe functions also been called, and return unsubscribe function.

#### destroy
  for clear memory

```ts
import { redox } from '@shuvi/redox'
const modelManager = redox();
const countStore = manager.get(count);

// getState of store
countStore.$state()

// call reducers
countStore.add(1)

// call effects
countStore.addAsync(1)

const unsubscribe = modelManager.subscribe(count, ()=>{
    console.log('state change')
})
unsubscribe();

const userStore = manager.get(user);
// call view
userStore.viewCount()
userStore.anyView(1)
```
