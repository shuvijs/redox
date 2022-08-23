/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, act } from '@testing-library/react'
import { defineModel, redox, Plugin } from '@shuvi/redox'
import {
  createContainer,
  RedoxRoot,
  useRootStaticModel,
  useRootModel,
} from '../src'

import { countModel } from './models'

jest.useFakeTimers()

beforeEach(() => {
  process.env.NODE_ENV = 'development'
})

describe('createContainer', () => {
  test('createContainer should return RedoxRoot and useSharedModel, useRootStaticModel', () => {
    const {
      Provider: _Provider,
      useSharedModel: _useSharedModel,
      useStaticModel: _useStaticModel,
    } = createContainer()

    expect(_Provider).toBeTruthy()
    expect(_useSharedModel).toBeTruthy()
    expect(_useStaticModel).toBeTruthy()
  })

  test('createContainer should accept redox argument', () => {
    const onInit = jest.fn()
    const onModel = jest.fn()
    const onModelInstanced = jest.fn()
    const onDestroy = jest.fn()
    const plugin: Plugin = () => {
      return {
        onInit,
        onModel,
        onModelInstanced,
        onDestroy,
      }
    }

    let initialState = {}

    const { Provider: LocalProvider, useSharedModel } = createContainer({
      initialState,
      plugins: [[plugin, {}]],
    })

    const SubApp = () => {
      const [_state] = useSharedModel(countModel)

      return null
    }

    render(
      <LocalProvider>
        <SubApp />
      </LocalProvider>
    )

    expect(onInit).toHaveBeenCalled()
    expect(onModel).toHaveBeenCalled()
    expect(typeof onModelInstanced.mock.calls[0][0].dispatch).toBe('function')
  })

  test('Local RedoxRoot and useSharedModel should work', () => {
    const { Provider: LocalProvider, useSharedModel } = createContainer()

    const SubApp = () => {
      const [state, actions] = useSharedModel(countModel)

      return (
        <>
          <div id="state">{state.value}</div>
          <button id="button" type="button" onClick={() => actions.add()}>
            add
          </button>
        </>
      )
    }

    const { container } = render(
      <LocalProvider>
        <SubApp />
      </LocalProvider>
    )

    expect(container.querySelector('#state')?.innerHTML).toEqual('1')
    act(() => {
      container
        .querySelector('#button')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(container.querySelector('#state')?.innerHTML).toEqual('2')
  })

  test('nest useSharedModel should get it own context', () => {
    const { Provider: LocalProviderA, useSharedModel: useSharedModelA } =
      createContainer()
    const { Provider: LocalProviderB, useSharedModel: useSharedModelB } =
      createContainer()

    const C = () => {
      const [stateA, _actionsA] = useSharedModelA(countModel)
      const [stateB, _actionsB] = useSharedModelB(countModel)

      return (
        <>
          <div id="stateCA">{stateA.value}</div>
          <div id="stateCB">{stateB.value}</div>
        </>
      )
    }

    const A = () => {
      const [state, actions] = useSharedModelA(countModel)

      return (
        <>
          <div id="stateA">{state.value}</div>
          <button id="buttonA" type="button" onClick={() => actions.add()}>
            add
          </button>
          <C></C>
        </>
      )
    }

    const B = () => {
      const [state, actions] = useSharedModelB(countModel)

      return (
        <>
          <div id="stateB">{state.value}</div>
          <button id="buttonB" type="button" onClick={() => actions.add()}>
            add
          </button>
          <C></C>
        </>
      )
    }

    const { container } = render(
      <LocalProviderA>
        <LocalProviderB>
          <A></A>
          <B></B>
        </LocalProviderB>
      </LocalProviderA>
    )

    expect(container.querySelector('#stateA')?.innerHTML).toEqual('1')
    expect(container.querySelector('#stateB')?.innerHTML).toEqual('1')
    expect(container.querySelector('#stateCA')?.innerHTML).toEqual('1')
    expect(container.querySelector('#stateCB')?.innerHTML).toEqual('1')
    act(() => {
      container
        .querySelector('#buttonA')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(container.querySelector('#stateA')?.innerHTML).toEqual('2')
    expect(container.querySelector('#stateB')?.innerHTML).toEqual('1')
    expect(container.querySelector('#stateCA')?.innerHTML).toEqual('2')
    expect(container.querySelector('#stateCB')?.innerHTML).toEqual('1')
  })

  test('each container should be isolation', () => {
    const { Provider: LocalProviderA, useSharedModel: useSharedModelA } =
      createContainer()

    const A = (props: { id: number }) => {
      const [state, actions] = useSharedModelA(countModel)

      return (
        <>
          <div id={`stateA${props.id}`}>{state.value}</div>
          <button
            id={`buttonA${props.id}`}
            type="button"
            onClick={() => actions.add()}
          >
            add
          </button>
        </>
      )
    }

    const Warp = function (props: { id: number }) {
      return (
        <LocalProviderA>
          <A {...props}></A>
        </LocalProviderA>
      )
    }

    const { container } = render(
      <>
        <Warp id={1}></Warp>
        <Warp id={2}></Warp>
      </>
    )

    expect(container.querySelector('#stateA1')?.innerHTML).toEqual('1')
    expect(container.querySelector('#stateA2')?.innerHTML).toEqual('1')
    act(() => {
      container
        .querySelector('#buttonA1')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(container.querySelector('#stateA1')?.innerHTML).toEqual('2')
    expect(container.querySelector('#stateA2')?.innerHTML).toEqual('1')
  })

  test('different containers share same redoxStore should has same state', () => {
    const redoxStore = redox()
    const { Provider: LocalProviderA, useSharedModel: useSharedModelA } =
      createContainer()
    const { Provider: LocalProviderB, useSharedModel: useSharedModelB } =
      createContainer()

    const C = () => {
      const [stateA, _actionsA] = useSharedModelA(countModel)
      const [stateB, _actionsB] = useSharedModelB(countModel)

      return (
        <>
          <div id="stateCA">{stateA.value}</div>
          <div id="stateCB">{stateB.value}</div>
        </>
      )
    }

    const A = () => {
      const [state, actions] = useSharedModelA(countModel)

      return (
        <>
          <div id="stateA">{state.value}</div>
          <button id="buttonA" type="button" onClick={() => actions.add()}>
            add
          </button>
          <C></C>
        </>
      )
    }

    const B = () => {
      const [state, actions] = useSharedModelB(countModel)

      return (
        <>
          <div id="stateB">{state.value}</div>
          <button id="buttonB" type="button" onClick={() => actions.add()}>
            add
          </button>
          <C></C>
        </>
      )
    }

    const { container } = render(
      <LocalProviderA store={redoxStore}>
        <LocalProviderB store={redoxStore}>
          <A></A>
          <B></B>
        </LocalProviderB>
      </LocalProviderA>
    )

    expect(container.querySelector('#stateA')?.innerHTML).toEqual('1')
    expect(container.querySelector('#stateB')?.innerHTML).toEqual('1')
    expect(container.querySelector('#stateCA')?.innerHTML).toEqual('1')
    expect(container.querySelector('#stateCB')?.innerHTML).toEqual('1')
    act(() => {
      container
        .querySelector('#buttonA')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(container.querySelector('#stateA')?.innerHTML).toEqual('2')
    expect(container.querySelector('#stateB')?.innerHTML).toEqual('2')
    expect(container.querySelector('#stateCA')?.innerHTML).toEqual('2')
    expect(container.querySelector('#stateCB')?.innerHTML).toEqual('2')
  })

  test('redoxStore can exist independently wether the component is unmount', () => {
    const { Provider: LocalProvider, useSharedModel } = createContainer()

    const SubApp = () => {
      const [state, actions] = useSharedModel(countModel)

      return (
        <>
          <div id="state">{state.value}</div>
          <button id="button" type="button" onClick={() => actions.add()}>
            add
          </button>
        </>
      )
    }

    const redoxStore = redox()

    const App = () => {
      const [toggle, setToggle] = React.useState(true)
      return (
        <>
          <button id="toggle" type="button" onClick={() => setToggle(!toggle)}>
            add
          </button>
          {toggle ? (
            <LocalProvider store={redoxStore}>
              <SubApp />
            </LocalProvider>
          ) : null}
        </>
      )
    }

    const { container } = render(<App />)

    expect(container.querySelector('#state')?.innerHTML).toEqual('1')
    act(() => {
      container
        .querySelector('#button')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(container.querySelector('#state')?.innerHTML).toEqual('2')
    act(() => {
      container
        .querySelector('#toggle')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    redoxStore.getModel(countModel).add(1)
  })

  test('container state should sync with redoxStore', () => {
    const { Provider: LocalProvider, useSharedModel } = createContainer()

    const SubApp = () => {
      const [state, actions] = useSharedModel(countModel)

      return (
        <>
          <div id="state">{state.value}</div>
          <button id="button" type="button" onClick={() => actions.add()}>
            add
          </button>
        </>
      )
    }

    const redoxStore0 = redox()
    const redoxStore1 = redox()

    const App = () => {
      const [toggle, setToggle] = React.useState(true)
      return (
        <>
          <button id="toggle" type="button" onClick={() => setToggle(!toggle)}>
            toggle
          </button>
          <LocalProvider store={toggle ? redoxStore0 : redoxStore1}>
            <SubApp />
          </LocalProvider>
        </>
      )
    }

    const { container } = render(<App />)

    expect(container.querySelector('#state')?.innerHTML).toEqual('1')
    act(() => {
      container
        .querySelector('#button')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(container.querySelector('#state')?.innerHTML).toEqual('2')
    act(() => {
      container
        .querySelector('#toggle')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(container.querySelector('#state')?.innerHTML).toEqual('1')
    act(() => {
      container
        .querySelector('#toggle')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(container.querySelector('#state')?.innerHTML).toEqual('2')
  })
})

describe('createContainer/RedoxRoot', () => {
  test('RedoxRoot should worked without props redoxStore', () => {
    const App = () => {
      const [state, actions] = useRootModel(countModel)
      return (
        <>
          <div id="value">{state.value}</div>
          <button id="button" type="button" onClick={() => actions.add()}>
            add
          </button>
        </>
      )
    }

    const { container } = render(
      <RedoxRoot>
        <App />
      </RedoxRoot>
    )

    expect(container.querySelector('#value')?.innerHTML).toEqual('1')
    act(() => {
      container
        .querySelector('#button')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(container.querySelector('#value')?.innerHTML).toEqual('2')
  })

  test('RedoxRoot props redoxStore could overwrite default redoxStore', () => {
    const App = () => {
      const [state] = useRootModel(countModel)
      return (
        <>
          <div id="value">{state.value}</div>
        </>
      )
    }

    const redoxStore = redox({
      initialState: {
        countModel: {
          value: 2,
        },
      },
    })

    const { container } = render(
      <RedoxRoot store={redoxStore}>
        <App />
      </RedoxRoot>
    )

    expect(container.querySelector('#value')?.innerHTML).toEqual('2')
  })
})

describe('createContainer/useRootModel', () => {
  describe('valid', () => {
    test('name should be required', async () => {
      const tempModel = defineModel({
        state: {
          value: 1,
        },
        reducers: {
          add(state, payload: number = 1) {
            state.value += payload
          },
        },
      })

      const App = () => {
        const [state, actions] = useRootModel(tempModel)

        return (
          <>
            <div id="value">{state.value}</div>
            <button id="button" type="button" onClick={() => actions.add()}>
              add
            </button>
          </>
        )
      }

      expect(() => {
        render(
          <RedoxRoot>
            <App />
          </RedoxRoot>
        )
      }).toThrow()
    })

    test('name should not be empty', async () => {
      const tempModel = defineModel({
        name: '',
        state: {
          value: 1,
        },
        reducers: {
          add(state, payload: number = 1) {
            state.value += payload
          },
        },
      })

      const App = () => {
        const [state, actions] = useRootModel(tempModel)

        return (
          <>
            <div id="value">{state.value}</div>
            <button id="button" type="button" onClick={() => actions.add()}>
              add
            </button>
          </>
        )
      }

      expect(() => {
        render(
          <RedoxRoot>
            <App />
          </RedoxRoot>
        )
      }).toThrow()
    })

    test('useRootModel should has parent RedoxRoot', async () => {
      const tempModel = defineModel({
        name: 'tempModel',
        state: {
          value: 1,
        },
        reducers: {
          add(state, payload: number = 1) {
            state.value += payload
          },
        },
      })

      const App = () => {
        const [state, actions] = useRootModel(tempModel)

        return (
          <>
            <div id="value">{state.value}</div>
            <button id="button" type="button" onClick={() => actions.add()}>
              add
            </button>
          </>
        )
      }

      expect(() => {
        render(<App />)
      }).toThrow()
    })
  })

  test('should keep state same ref in different component', async () => {
    let AppState: any = null
    let AppState1: any = null
    const App = () => {
      const [state, actions] = useRootModel(countModel)
      const [state1, _actions1] = useRootModel(countModel)
      AppState = state
      AppState1 = state1
      return (
        <>
          <div id="value">{state.value}</div>
          <button id="button" type="button" onClick={() => actions.add(1)}>
            add
          </button>
          <SubApp></SubApp>
        </>
      )
    }
    let SubAppState: any = null
    function SubApp() {
      const [state, _actions] = useRootModel(countModel)
      SubAppState = state
      return <></>
    }

    const { container } = render(
      <RedoxRoot>
        <App />
      </RedoxRoot>
    )

    expect(container.querySelector('#value')?.innerHTML).toEqual('1')

    expect(AppState).toBeTruthy()
    expect(AppState === AppState1).toBeTruthy()
    expect(AppState === SubAppState).toBeTruthy()
    act(() => {
      container
        .querySelector('#button')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(container.querySelector('#value')?.innerHTML).toEqual('2')
    expect(AppState === AppState1).toBeTruthy()
    expect(AppState === SubAppState).toBeTruthy()
  })

  test('should keep actions same ref', async () => {
    let AppActions: any = null
    let AppActions1: any = null
    const App = () => {
      const [state, actions] = useRootModel(countModel)
      const [_state1, actions1] = useRootModel(countModel)
      AppActions = actions
      AppActions1 = actions1
      return (
        <>
          <div id="value">{state.value}</div>
          <button id="button" type="button" onClick={() => actions.add(1)}>
            add
          </button>
          <SubApp></SubApp>
        </>
      )
    }
    let SubAppActions: any = null
    function SubApp() {
      const [_state, actions] = useRootModel(countModel)
      SubAppActions = actions
      return <></>
    }

    const { container } = render(
      <RedoxRoot>
        <App />
      </RedoxRoot>
    )

    expect(container.querySelector('#value')?.innerHTML).toEqual('1')

    expect(AppActions).toBeTruthy()
    expect(AppActions === AppActions1).toBeTruthy()
    expect(AppActions === SubAppActions).toBeTruthy()
    act(() => {
      container
        .querySelector('#button')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(container.querySelector('#value')?.innerHTML).toEqual('2')
    expect(AppActions === AppActions1).toBeTruthy()
    expect(AppActions === SubAppActions).toBeTruthy()
  })

  test("should keep data's state with component unmount or not", async () => {
    const SubApp = () => {
      const [state, actions] = useRootModel(countModel)

      return (
        <>
          <div id="state">{state.value}</div>
          <button id="button" type="button" onClick={() => actions.add()}>
            add
          </button>
        </>
      )
    }

    const App = () => {
      const [toggle, setToggle] = React.useState(true)
      return (
        <>
          <button id="toggle" type="button" onClick={() => setToggle(!toggle)}>
            add
          </button>
          {toggle ? <SubApp /> : null}
        </>
      )
    }

    const { container } = render(
      <RedoxRoot>
        <App />
      </RedoxRoot>
    )

    expect(container.querySelector('#state')?.innerHTML).toEqual('1')
    act(() => {
      container
        .querySelector('#button')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(container.querySelector('#state')?.innerHTML).toEqual('2')
    act(() => {
      container
        .querySelector('#toggle')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(container.querySelector('#state')?.innerHTML).toEqual(undefined)
    act(() => {
      container
        .querySelector('#toggle')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(container.querySelector('#state')?.innerHTML).toEqual('2')
  })
})

describe('createContainer/useRootStaticModel', () => {
  describe('valid', () => {
    test('name should be required', async () => {
      const tempModel = defineModel({
        state: {
          value: 1,
        },
        reducers: {
          add(state, payload: number = 1) {
            state.value += payload
          },
        },
      })

      const App = () => {
        const [state, actions] = useRootStaticModel(tempModel)

        return (
          <>
            <div id="value">{state.current.value}</div>
            <button id="button" type="button" onClick={() => actions.add()}>
              add
            </button>
          </>
        )
      }

      expect(() => {
        render(
          <RedoxRoot>
            <App />
          </RedoxRoot>
        )
      }).toThrow()
    })

    test('name should not be empty', async () => {
      const tempModel = defineModel({
        name: '',
        state: {
          value: 1,
        },
        reducers: {
          add(state, payload: number = 1) {
            state.value += payload
          },
        },
      })

      const App = () => {
        const [state, actions] = useRootStaticModel(tempModel)

        return (
          <>
            <div id="value">{state.current.value}</div>
            <button id="button" type="button" onClick={() => actions.add()}>
              add
            </button>
          </>
        )
      }

      expect(() => {
        render(
          <RedoxRoot>
            <App />
          </RedoxRoot>
        )
      }).toThrow()
    })

    test('useRootStaticModel should has parent RedoxRoot', async () => {
      const tempModel = defineModel({
        name: 'tempModel',
        state: {
          value: 1,
        },
        reducers: {
          add(state, payload: number = 1) {
            state.value += payload
          },
        },
      })

      const App = () => {
        const [state, actions] = useRootStaticModel(tempModel)

        return (
          <>
            <div id="value">{state.current.value}</div>
            <button id="button" type="button" onClick={() => actions.add()}>
              add
            </button>
          </>
        )
      }

      expect(() => {
        render(<App />)
      }).toThrow()
    })
  })

  test('should state keep same ref in one component', () => {
    let stateRef: any
    let stateRef1: any

    const StaticApp = () => {
      const [state, dispatch] = useRootStaticModel(countModel)
      const [_, setValue] = React.useState(false)

      if (!stateRef) {
        stateRef = state
      }

      stateRef1 = state

      return (
        <>
          <div id="state">{state.current.value}</div>
          <button
            id="add"
            type="button"
            onClick={() => {
              dispatch.add()
              setValue(true)
            }}
          >
            add
          </button>
        </>
      )
    }

    const { container } = render(
      <RedoxRoot>
        <StaticApp />
      </RedoxRoot>
    )

    act(() => {
      container
        .querySelector('#add')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(stateRef === stateRef1).toBeTruthy()
  })
})
