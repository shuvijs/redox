<div align="center">
<h1>Redox</h1>
</div>

Redox is a decentralized storage management, base on Redux best practices without the boilerplate. No more action types, action creators, switch statements.

<hr />

## how to use

- strongly typed supported.
- config
  - name*
    name is necessary and should be unique
  - reducers*
    - is the reducer concept of Redux
    - [immer](https://github.com/immerjs/immer) support by default
  - effects?
    some effects functions, like fetch data
  - views?
    define view by property
  - depends?
    if a model is depends other model, it is very useful. eg: depends isLogin status.

- sample api to use
  - dispatch
    dispatch is a function, with key of reducers and effects. 
  - getState
    return state of store
  - subscribe
    return unsubscribe function and trigger when state changed.
  - views
    call config views method, view will  collect dependencies with automatic. if depends on changes, view return value with cache.
  - destroy
    for clear memory

```ts
import { defineModel } from '@shuvi/redox'

const count = defineModel({
    name: 'count', // necessary and should be unique
    state: { value: 0 },
    // concept of Redux 
    reducers: {
        increment: (state, payload: number) => {
            return {
                value: state.value + payload,
            }
        },
    },
    effects: {
        // some effects method
        async incrementAsync(payload: number, _state) {
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
      async depends(_payload: string, _state, depends) {
        console.log('depends: ', depends);
        const { getState, dispatch } = depends;
        // get depends state
        const dependsState = getState();
        const countState = dependsState.count
        // trigger depends dispatch
        dispatch.count({type: 'increment', payload: 1})
        dispatch.count({type: 'incrementAsync', payload: 1})
        dispatch.count.increment(1)
        dispatch.count.incrementAsync(1)
      }
    },
    views: {
      d (state, dependsState): {value: number} {
        // dependsState point depends state collection
        console.log(state.id);
        return dependsState.count;
      },
      double (state, _dependsState, args): string {
          // args allow custom args
          // this point views
        return `state.id=>${state.id}, args=>${args},views.one=>${this.d.number}`;
      }
    }
  },
  [ count ] // defined depends
);
```
consume models by redox
```ts
import { redox } from '@shuvi/redox'
const manager = redox();
const countStore = manager.get(count);
count.getState()

// reducers
count.dispatch({type: 'increment', payload: 1}) 
dispatch.count.increment(1)

// effects
count.dispatch({type: 'incrementAsync', payload: 1}) 
dispatch.count.incrementAsync(1)

const unsubscribe = count.subscribe(()=>{
    console.log('state change')
})
unsubscribe();

const userStore = manager.get(user);
// call view
userStore.views.d()
userStore.views.ddouble('string')
```

## redox with react

`@shuvi/redox-react` is library redox work with react. it can rendered by state changed.

### show to works

`createContainer` return a independent scope `Provider, useModel, useStaticModel` for consume models. 

```ts
const { Provider, useModel, useStaticModel } = createContainer();
```

All the models in same `Provider` can be shared by each other. `useModel, useStaticModel` for consume models. the different between `useModel` and `useStaticModel` is that, `useStaticModel` will not rerender on state changed.

```ts
const count = defineModel({
	name: 'count',
	state: { value: 0 },
	reducers: {
		increment: (state, payload: number) => {
			return {
				value: state.value + payload
			}
		},
	},
	effects: {
		async incrementAsync() {
			await delay(2)
			this.increment(1)
		},
	}
})
function Count() {
	const [{ value }, { increment, incrementAsync }] = useModel(count);
	return (
        <>
            <h1>Basic use</h1>
            <div style={{ width: 120 }}>
                <h3>count: {value}</h3>
                <button onClick={()=>increment(1)}>+1</button>
                <button onClick={incrementAsync}>Async +1</button>
            </div>
        </>
	)
}

```

```ts
function App() {
	return (
		<>
			<Provider>
				<Count />
			</Provider>
		</>
	)
}
```

> `Provider` accepts props modelManager, there is way to connect to different independent scopes by shared with same modelManager call `redox()`

`useLocalModel` always create a independent scope quickly. without `Provider`

```ts
const local = defineModel({
	name: 'local',
	state: { value: 'localValue' },
	reducers: {
		setLocal: (_state, payload: string) => {
			return {
				value: payload
			}
		},
	},
})
function Count() {
	const [{ value }] = useLocalModel(local)
	return (
		<div>
            <h1>Test local model</h1>
            <div>
                <h3>test: {value}</h3>
            </div>
        </div>
	)
}
```

### selector

`useModel, useStaticModel, useLocalModel`, first param is `model`, second param is `selector`.

`selector` selects the state what the react needed, and it also reduce render times.

`ISelector` is typescript tips for create selector.

```ts
import type { ISelector } from '@shuvi/redox-react'
const selector:ISelector<typeof user> = function (state, views) {
  console.log('call selector'); 
  return {
    stateData: state.id,
    double: views.double(3),
    d: views.d().value
  };
};
```
```ts
const [views, actions] = useModel(user, selector);
const [views, actions] = useStaticModel(user, selector);
const [views, actions] = useLocalModel(user, selector);

```

### global container

`@shuvi/redox-react` export `Provider, useModel, useStaticModel` is global scope for consume models.



