<div align="center">
<h1>redox-react</h1>
</div>

Redox-react includes its own hook APIs, which allow your React Components to subscribe to the redox store and dispatch actions.

* [useModel](#usemodel)
* [useRootModel](#userootmodel)
* [useRootStaticModel](#userootstaticmodel)
* [useSharedModel](#usesharedmodel)
* [useStaticModel](#usestaticmodel)

## Installation
Install with npm:
```
npm install @shuvi/redox-react
```
Install with yarn
```
yarn add @shuvi/redox-react
```

## Usage

### Use different hooks depends on the scenario
Redox offers multiple hooks for different situations.

`useModel` would be the first choice if there is no suitable hooks to choose.

`useRootModel` aims to store global variable that offers for all react components.

`useRootStatic` aims to store global static data, such as environment variable, only get it at first time.

`useSharedModel` allows you to share data across specific components, not globally but locally.

`useStaticModel` allows you to share local static data across specific components.

### Multiple providers
The global provider would be wrapped from the topest component at the first, but it could have aonother providers applied at runtime, which allows you to change the context.

## Examples
Global context provider
```tsx title="src/index.tsx"
import * as React from 'react';
import ReactDOM from 'react-dom';
import { RedoxRoot } from '@shuvi/redox-react';
import App from './App';
function App() {
    return (
        ReactDOM.render(
            <RedoxRoot>
                <App />
            </RedoxRoot>,
            document.getElementById('root')
        )
    )
}
```
``` ts
const user = defineModel(
	{
		name: 'user',
		state: {
            // state of the store
        },
		reducers: {
            // some reducers
		},
        actions: {
            // some actions
        },
		views: {
			// some views function
		},
	},
	[] // some dependencies
)
```
Subscribe to the redox store and get actions from hooks
```tsx title="src/App.tsx"
import * as React from 'react';
import {
    ISelectorParams,
    createContainer,
    useModel,
    useRootModel,
    useRootStaticModel
} from '@shuvi/redox-react';
// select the state only if the component needs it,
// reduce unnecessary rerendering
const selector = function (stateAndViews: ISelectorParams<typeof user>) {
    return {
        stateData: stateAndViews.data,
        result: stateAndViews.getResultFromView(),
        count: stateAndViews.viewCount()
    };
};

export default function App() {
    const [state, actions] = useModel(user, selector);
    const [globalState, globalActions] = useRootModel(user);
    const [globalStaticState, _globalActions] = useRootStaticModel(user);
    return (
        ...
    )
}
```
Share the context across components
``` tsx src/ComponentWithSharedModel.tsx
import * as React from 'react';
import ReactDOM from 'react-dom';
import { createContainer } from '@shuvi/redox-react';

const { Provider: LocalProvider, useSharedModel, useStaticModel } = createContainer();

function ComponentA() {
    const [state, actions] = usesharedModel(user);
    const [staticState, _] = useStaticModel(user);
    return (
        ...
    )
}

function ComponentB() {
    const [state, actions] = usesharedModel(user);
    const [staticState, _] = useStaticModel(user);
    return (
        ...
    )
}

export default function ComponentWithSharedModel() {
    return (
        <LocalProvider>
            <ComponentA />
            <ComponentB />
        </LocalProvider>
    )
}
```
You could implement plugins as middlewares of the store
``` tsx src/plugin.tsx
import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'
import { redox } from '@shuvi/redox'
import redoxLog from '@shuvi/redox-log'
import persist, { createWebStorage } from '@shuvi/redox-persist'
import { RedoxRoot } from '@shuvi/redox-react'

const modelManager = redox({
	initialState: {},
	plugins: [
		[redoxLog],
		[
			persist,
			{
				key: 'root',
				storage: createWebStorage('local'),
				// whitelist: ['b'],
				blacklist: ['b'],
				migrate: function (storageState: any, version: number) {
					console.log('migrate version: ', version)
					console.log('migrate storageState: ', storageState)
					const count = storageState.count
					if (count && count.value >= 3) {
						count.value = 2
					}
					return storageState
				},
			},
		],
	],
})

ReactDOM.render(
	<RedoxRoot modelManager={modelManager}>
		<App />
	</RedoxRoot>,
	document.getElementById('root')
)

```

## API
### useModel()
```tsx
import { useModel } from '@shuvi/redox-react';
const [state, actions] = useModel(model: IModel, selector?: ISelector);
```
Most of time you would use `useModel` to extract data from the model. It will create new context everytime you use it.

### useRootModel() 
```tsx
import { useRooteModel } from '@shuvi/redox-react';
const [state, actions] = useRooteModel(model: IModel, selector?: ISelector);
```
Global `Provider` context, you can get the global context anywhere, even if the component is unmount, the state will not be destroyed.

### useRootStaticModel()
```tsx
import { useRootStaticModel } from '@shuvi/redox-react';
const [state, actions] = useRootStaticModel(model: IModel, selector?: ISelector);
```
`useRootStaticModel` is similar to `useRootModel`, the different is that, `useRootStaticModel` will not rerender on state changed.

### createContainer()
It returns a independent scope `Provider, useSharedModel, useStaticModel` for context and methods to consume models.
```ts title="shared"
import { createContainer } from '@shuvi/redox-react';
export const { Provider, useSharedModel, useStaticModel } = createContainer();
```
#### Provider
In the same `Provider` context, the state is shared across the store
#### useSharedModel()
```tsx
const [state, actions] = useSharedModel(model: IModel, selector?: ISelector);
```
Share the context across components
#### useStaticModel()
```tsx
const [state, actions] = useStaticModel(model: IModel, selector?: ISelector);
```
`useStaticModel` is similar to `useSharedModel`, the different is that, `useStaticModel` will not rerender on state changed.
> `useStaticModel` doest not support [Destructuring Assignment](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment).
