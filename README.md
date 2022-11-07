<div align="center">
<h1>redox</h1>
</div>

Redox is a decentralized state management solution based on the concept of redux. Stores are created on demand, which prevents from initializing all of the stores at very first time.

- TypeScript friendly
- Easy and efficient.
- Use in Local and Global
- **ES modules** and **tree-shaking** support.

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

```ts
import { defineModel } from '@shuvi/redox'

const count = defineModel({
  name: 'count',
  state: { count: 0 },
  actions: {
    add(n: number) {
      this.count += n
    },
  },
})
```

## Examples

```tsx
import { defineModel } from '@shuvi/redox'

const filters = defineModel({
  name: 'filters',
  state: {
    status: 'todo',
    search: '',
  },
  actions: {
    updateStatus(state, status: 'todo' | 'doing' | 'done') {
      this.status = status
    },
    updateSearch(state, search: string) {
      this.search = search
    },
  },
})

const todo = defineModel(
  {
    name: 'todo',
    state: {
      todoList: [],
    },
    actions: {
      add(state, todo) {
        this.todoList.push(todo)
      },
      remove(state, id) {
        const index = this.todoList.findIndex((todo) => todo.id === id)
        if (index >= 0) {
          this.todoList.splice(index, 1)
        }
      },
      async fetchTodos() {
        const resp = await fetch('https://example.com/todos')
        const data = await response.json()
        this.todoList = data
      },
    },
    views: {
      // value are cached based on state and $deps
      filteredTodos() {
        const filters = this.$dep.filters
        return this.todoList.filter(
          (todo) =>
            todo.status === filters.status &&
            todo.content.includes(filters.content)
        )
      },
      finishedTodos() {
        return this.todoList.filter((todo) => todo.status === 'done')
      },
    },
  },
  [filters] // defined depends
)
```

```tsx
import * as React, { useEffect } from 'react'
import { useModel } from '@shuvi/redox-react'

function App() {
  const [state, actions] = useModel(users)

  useEffect(() => {
    actions.fetchTodos()
  }, [])

  return (
    <div>
      {state.filteredTodos.map((todo) => (
        <div>[{todo.status}]: {todo.content}</div>
      ))}
    </div>
  )
}
```

### defineModel(options, depends?)

#### `options [object]`

| Name       | Type                                                                    | Description                                                                                                                                                                        |
| ---------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name?`    | `string`                                                                | `optional` for **useModel**, `required` for **useRootModel**, **useSharedModel** and **useRootStaticModel**. Since `name` is treated as the key of `cache`, it should be `unique`. |
| `state`    | `object`, `string`, `number`, `boolean`, `array`, `undefined` or `null` | `required`. It could be any primitive type except `bigint` and `symbol`.                                                                                                           |
| `actions?` | `object`                                                                | `optional`. Normally user defined actions have more complex logic than actions of reducers, like fetching data then dispatch actions.                                              |
| `views?`   | `object`                                                                | `optional`. Functions in views have `cache` mechanism. It holds the returned value of functions. Upadte the `cache` if the state of dependencies has changed.                      |

#### `depends? [array]`

`optional`. It collects other models that the defined model depends on. Defined model would be aware of the `change of state` if it ever happened in any of model dependencies.

## Core Concepts

### `state`

The state does not limited to the `object`, Redox also supports `number`, `string`, `boolean` and `array` as the state. The reason for doing this is because the best practice for Redox is to create the model for every component, using Redox everywhere for your state management.

### `actions`

Actions is where to arrange operations against state. They can be asynchronous.

```ts
const count = defineModel({
  name: 'user',
  state: {
    user: null,
  },
  actions: {
    async getUserInfo() {
      const response = await fetch(`https://example.com/user/detail`)
      const data = await response.json()
      this.user = data
    },
  },
})
```

### `views`

The return value of view function is cached based on the state.

```ts
const todo = defineModel({
  name: 'todo',
  state: {
    todos: [
      {
        status: 'todo',
      },
    ],
  },
  views: {
    finished(index: number) {
      return this.todos.filter((todo) => todo.status === 'done')
    },
    fisrtFinished() {
      return this.finished[0]
    },
  },
})
```

## React

- [Hooks provided for React](./packages/react/README.md)

## Plugins

For now, Redox support two plugins. We will suppport more useful plugins in the future.

- [Logger](./packages/plugins/log/package.json): Prints out the related information for degguging.
- [Persist](./packages/plugins/persist/package.json): Preserves the state of stores in the localStorage.
