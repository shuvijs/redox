<div align="center">
<h1>redox</h1>
</div>

Redox is a decentralized state management solution based on the concept of redux. Stores are created on demand, which prevents from initializing all of the stores at very first time.

* **ES modules** and **tree-shaking** support.
* A lightweight solution, redox/**2kB**, redox-react/**1kB**
* [React Devtools](https://github.com/facebook/react/tree/master/packages/react-devtools) support
* TypeScript support
* SSR support
* Components monitor the state of stores, rerender if the state change
* Optimize render times across multiple contexts 
* Keep state when [hmr](https://webpack.js.org/concepts/hot-module-replacement/)

<hr />

## Installation
Install with npm:
```
npm install @shuvi/redox
```
Install with yarn
```
yarn add @shuvi/redox
```

## Usage

### Level up your state management with Redox
Redox allows you to define multiple stores, and the stores are created on demand. It really increases the flexibility that you could seperate the logic across multiple stores.

### SSR Support
Redox allows you building the stores on the server side.

### Plugins support out of the box
For now, Redox support two plugins. We will suppport more useful plugins in the future.
* [Logger](./packages/plugins/log/package.json): Prints out the related information for degguging.
* [Persist](./packages/plugins/persist/package.json): Preserves the state of stores in the localStorage.

## Examples
```ts
import { defineModel } from '@shuvi/redox'

const count = defineModel({
    name: 'count',
    state: { value: 0 },
    reducers: {
        add: (state, payload: number) => {
            return {
                value: state.value + payload,
            }
        },
    },
    actions: {
      // some actions
      async addAsync(payload: number, _state) {
        // asynchonus action
        await delay(payload)
        // generated action for the reducer
        this.increment(1)
      },
    },
})

const users = defineModel(
  {
    name: 'users',
    state: {
      list: {}
    },
    reducers: {
      // update list by returned value
      updateUserName: (state, userInfo) => {
        return {
          ...state,
          [userInfo.id]: {
            name: userInfo.name  
          } 
        };
      },
      // immutable remove the user with immer 
      remove: (state, id) => {
        if (id in state) {
          delete state[id]
        }
      },
      setList: (_, newList) => {
        return newList
      }
    },
    actions: {
      // asynchronous function
      async fetchUserList() {
        const list = await fetchList();
        this.setList(list);
      },
      // getter, won't cache
      getUserName(id) {
        return this.list[id]?.name || ""
      },
    },
    views: {
      // return value from the cache,
      // if the arguments have invoked before,
      // or the 'list' has not changed
      getUserName(id) {
        return this.list[id]?.name || ""
      },
      // return value from the cache if $dep's state not changed,
      getDepState() {
        return this.$dep.count.value
      }
    }
  },
  [ count ] // defined depends
);
```

```tsx
import * as React from 'react'
import { useModel } from '@shuvi/redox-react'

function App() {
  const [state, actions] = useModel(users, selector);
  return (
    <div>
      {
        state.list.map(user => (
          <p>{user.name}:{user.id}</p>
        ))
      }
      <button onClick={() => actions.fetchUserList()}>update list</button>
    </div>
  )
}
```
### defineModel(options, depends?)

#### `options [object]`
| Name         | Type  |   Description  |
|--------------|--------------------------------------|------------------------------------------|
| `name?`       | `string`                            | `optional` for **useModel**, `required` for **useRootModel**, **useSharedModel** and **useRootStaticModel**. Since `name` is treated as the key of `cache`, it should be `unique`.                                                                            |
| `state`      | `object`, `string`, `number`, `boolean`, `array`, `undefined` or `null`                              | `required`. It could be any primitive type except `bigint` and `symbol`. |
| `reducers?`      | `object`                          | `optional`. Define your reducers here, the corresponding actions will be `generated automatically`.  [immer](https://github.com/immerjs/immer) support out of the box.  |
| `actions?`  | `object`| `optional`. Normally user defined actions have more complex logic than actions of reducers, like fetching data then dispatch actions. |
| `views?`     | `object` | `optional`. Functions in views have `cache` mechanism. It holds the returned value of functions. Upadte the `cache` if the state of dependencies has changed. |
#### `depends? [array]`
`optional`. It collects other models that the defined model depends on. Defined model would be aware of the `change of state` if it ever happened in any of model dependencies.
## Core Concepts

### `state`
The state does not limited to the `object`, Redox also supports `number`, `string`, `boolean` and `array` as the state. The reason for doing this is because the best practice for Redox is to create the model for every component, using Redox everywhere for your state management.

### `actions`
Accessible context of `this` in the actions:

* `$state()` - return the state of a store, it's the only way to access the `primitive state`
* `$set(newState: any)` - replace the state with `newState` 
* `$modify(modifier: (state) => void)` - `modifier` is a callback function allows the manipulation of `array` and `object`, updating the immutable state, the returned value will be ignored
* `$dep` - collection of dependencies
* `plain object` - directly access the state if type of the state is `object`
* `function from actions` - capable of invoking the function from actions
* `function from views` - capable of invoking the function from views
### `views`
The caculated results from the function will be memorizing in the cache.
Below is the accessible context of `this` in the views:
* `$state()` - return the state of a store, it's the only way to access the primitive state
* `$dep` - collection of dependencies 
* `plain object` - directly access the state if type of the state is `object`
* `function from views` - capable of invoking the function from views

```ts
let numberOfCalls = 0

const arrayModel = defineModel({
  name: 'arrayModel',
  state: [0, 1],
  reducers: {
    doNothing: (state) => {
      return state
    },
  },
  views: {
    getArr(index: number) {
      numberOfCalls++
      return this.$state()[index]
    },
  },
})

const arrayStore = manager.get(arrayModel)

let valueFromViews

console.log(numberOfCalls) // 0
// cache miss, memorize state[0] into the cache
valueFromViews = arrayStore.getArr(0)
// first time the function has been called
console.log(numberOfCalls) // 1
console.log(valueFromViews) // 0

// the generated action has done nothing
arrayStore.doNothing()
// cache hit, return the value from the cache
valueFromViews = arrayStore.getArr(0)
// since the result got from the cache, the function hasn't been called
console.log(numberOfCalls) // 1
console.log(valueFromViews) // 0
// cache miss, memorize state[1] into the cache
valueFromViews = arrayStore.getArr(1)
// since cache missed, get the value by invoking the function
console.log(numberOfCalls) // 2
console.log(valueFromViews) // 1
```

## React
* [Hooks provided for React](./packages/react/README.md)
