<div align="center">
<h1>redox-react</h1>
</div>

redox-react is a decentralized state management solution based on redox. Stores are created on demand, which prevents from initializing all of the stores at very first time.

<hr />

## Features
1. A lightweight solution, redox/**2kB**redox-react/**1kB** 
2. esmodule and Tree Shaking are supported.
3. [React Devtools](https://github.com/facebook/react/tree/master/packages/react-devtools) support
4. TypeScript support
5. SSR support
6. Components monitor the state of stores, rerender if the state change
7. Optimize render times across multiple contexts 
8. Keep state when [hmr](https://webpack.js.org/concepts/hot-module-replacement/)
## producer consumer model

  - **producer** `defineModel`

    The model like react component, which can be run separately or combined through the second parameter `depend`
    
  - **consumer** `useModel` `useRootModel` `useSharedModel` `useRootStaticModel`

    These several hooks consume the model in the `Provider` context, create the store at the moment it have been called.

## `defineModel(options, depends?)`

### `options [object]`
| Name         | Type  |   Description  |
|--------------|--------------------------------------|------------------------------------------|
| `name?`       | `string`                            | `optional` for **useModel**, `required` for **useRootModel**, **useSharedModel** and **useRootStaticModel**. Since `name` is treated as the key of `cache`, it should be `unique`.                                                                            |
| `state`      | `object`, `string`, `number`, `boolean`, `array`, `undefined` or `null`                              | `required`. It could be any primitive type except `bigint` and `symbol`. |
| `reducers?`      | `object`                          | `optional`. Define your reducers here, the corresponding actions will be `generated automatically`.  [immer](https://github.com/immerjs/immer) support out of the box.  |
| `actions?`  | `object`| `optional`. Normally user defined actions have more complex logic than actions of reducers, like fetching data then dispatch actions. |
| `views?`     | `object` | `optional`. Functions in views have `cache` mechanism. It holds the returned value of functions. Upadte the `cache` if the state of dependencies has changed. |
### `depends? [array]`
`optional`. It collects other models that the defined model depends on. Defined model would be aware of the `change of state` if it ever happened in any of model dependencies. 
```ts
import { defineModel } from '@shuvi/redox'

const count = defineModel({
    name: 'count',
    state: { value: 0 },
    // concept of Redux
    reducers: {
        add: (state, payload: number) => {
            return {
                value: state.value + payload,
            }
        },
    },
    actions: {
        // some actions method
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
    actions: {
      async depends(selfArg0: string, selfArg1: number, selfArg2: any) {
        // get current state
        const state = this.$state()
        // call self action
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

> `this` in `actions` and `views` could access itself. `TypeScript` support very well, it could automatically infers the available types and actively mark the given errors. Easily debug and understand what's going wrong. 

## `usexxModel(model, selector?)`

### `model [IModel]`
`required`. The model created by `defineModel`.
### `selector [ISelector]` 

`optional`. It selects the state for what react component need, the reason of doing this has considered the `performance` issue, avoiding `unnecessary rendering` for the component.

> `ISelector` is typescript tips for create selector.

```ts
import type { ISelectorParams } from '@shuvi/redox-react'
const selector = function (stateAndViews: ISelectorParams<typeof user>) {
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

### `useRootModel`

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

It acts same as `useSharedModel`, except `useStaticModel` does nothing if the state has changed.

> `useStaticModel` not support [Destructuring Assignment](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment). no error eg `const [state, _] = useStaticModel(model)`

## modelManager

### Store
  return by modelManager.get(model), Store contains keys of reducers, actions and views.
  - $state
    return state of store
  - $set
    set new state of store
  - $modify
    modify state of store
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

// setState of store
countStore.$set(newState)

// modify state of store
countStore.$modify(state => {
  state.count += 1
  state.bool = false
  // ...
})

// call reducers
countStore.add(1)

// call actions
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
