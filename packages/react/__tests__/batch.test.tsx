/**
 * @jest-environment jsdom
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { defineModel } from '@shuvi/redox'
import { act } from 'react-dom/test-utils';
import { useModel, Provider } from '../src';

const countModel = defineModel({
	name: 'countModel',
  state: {
    value: 1,
    value1: 1
  },
	reducers: {
    addValue(state) {
      return {
        ...state,
        value: state.value + 1
      };
    },
    addValue1(state) {
      return {
        ...state,
        value1: state.value1 + 1
      };
    }
  },
	views:{
		test(state, _dependsState, args): number{
			return state.value + args
		}
	}
});

describe('test batch', () => {
  let node: HTMLDivElement;
  beforeEach(() => {
    node = document.createElement('div');
    document.body.appendChild(node);
  });

  afterEach(() => {
    document.body.removeChild(node);
    (node as unknown as null) = null;
  });

  test('once store change, update should batch in one render', () => {
    let renderCount = 0;

    function SubApp() {
      renderCount += 1;
      const [{ value1 }, { addValue1 }] = useModel(countModel);

      return (
        <>
          <div id="addValue1">value1:{value1}</div>
          <div
            id="button1"
            onClick={() => {
              addValue1();
            }}
          >
            addValue1
          </div>
        </>
      );
    }

    function App() {
      const [{ value }, { addValue }] = useModel(countModel);
      return (
        <div>
          <div id="addValue">value:{value}</div>
          <div id="button" onClick={() => addValue()}>
            addValue
          </div>
          <SubApp />
        </div>
      );
    }

    act(() => {
      ReactDOM.render(
        <Provider>
          <App />
        </Provider>,
        node
      );
    });

    expect(renderCount).toBe(1);

    act(() => {
      node
        .querySelector('#button')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(renderCount).toBe(2);
    expect(node.querySelector('#addValue')?.innerHTML).toEqual('value:2');

    act(() => {
      node
        .querySelector('#button1')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(renderCount).toBe(3);
    expect(node.querySelector('#addValue1')?.innerHTML).toEqual('value1:2');
  });

  test('state selector should reduce the rerender times', () => {
    let renderCount = 0;
    let computed = 0;

    function App() {
			renderCount += 1;
			const [{ value, test }, { addValue, addValue1 }] = useModel(
				countModel,
				(state, views)=>{
					computed+=1;
					return {
						test: views.test(3),
						value: state.value
					}
				}
      );
			const [{test1}, _dispatch] = useModel(countModel, (_state, views)=>{
				return {
					test1: views.test(4),
				}
			});
			const [index, setIndex] = React.useState(0);

      return (
        <div>
          <div id='index'>index:{index}</div>
          <div id='value'>value:{value}</div>
          <div id='test'>test:{test}</div>
          <div id='test1'>test1:{test1}</div>
          <button id='index-button' onClick={() => setIndex(1)}>setIndex</button>
          <button id='button' onClick={() => addValue()}>addValue</button>
          <button id='button1' onClick={() => addValue1()}>addValue1</button>
        </div>
      );
    }

		act(() => {
			ReactDOM.render(
				<Provider>
					<App />
				</Provider>,
				node
			);
		});

    expect(renderCount).toBe(1);
    expect(computed).toBe(1);

		expect(node.querySelector('#index')?.innerHTML).toEqual('index:0');
		expect(node.querySelector('#value')?.innerHTML).toEqual('value:1');
		expect(node.querySelector('#test')?.innerHTML).toEqual('test:4');
		expect(node.querySelector('#test1')?.innerHTML).toEqual('test1:5');

		act(() => {
			node
				.querySelector('#index-button')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		expect(renderCount).toBe(2);
		expect(computed).toBe(1);

		expect(node.querySelector('#index')?.innerHTML).toEqual('index:1');
		expect(node.querySelector('#value')?.innerHTML).toEqual('value:1');
		expect(node.querySelector('#test')?.innerHTML).toEqual('test:4');
		expect(node.querySelector('#test1')?.innerHTML).toEqual('test1:5');

		act(() => {
			node
				.querySelector('#button')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		expect(renderCount).toBe(3);
		expect(computed).toBe(2);

		expect(node.querySelector('#index')?.innerHTML).toEqual('index:1');
		expect(node.querySelector('#value')?.innerHTML).toEqual('value:2');
		expect(node.querySelector('#test')?.innerHTML).toEqual('test:5');
		expect(node.querySelector('#test1')?.innerHTML).toEqual('test1:6');

		act(() => {
			node
				.querySelector('#button1')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		expect(renderCount).toBe(3);
		expect(computed).toBe(3);

		expect(node.querySelector('#index')?.innerHTML).toEqual('index:1');
		expect(node.querySelector('#value')?.innerHTML).toEqual('value:2');
		expect(node.querySelector('#test')?.innerHTML).toEqual('test:5');

  });
  test('depends update beDepend should update', () => {
    let parentRenderCount = 0;
    let childRenderCount = 0;

		const appModel = defineModel({
			name: 'appModel',
			state: {
				value: 2,
			},
			reducers: {
				addValue(state) {
					return {
						...state,
						value: state.value * 10
					};
				},
			},
			views:{
				test(state, dependsState): number{
					return state.value + dependsState.countModel.value
				}
			}
		}, [ countModel ]);

    function SubApp() {
      childRenderCount += 1;

      const [{ value }, { addValue }] = useModel(
				countModel
      );

      return (
        <>
          <div id='value'>value:{value}</div>
          <button
						id='button'
            onClick={() => {
              addValue();
            }}
          >
            addValue
          </button>
        </>
      );
    }

    function App() {
      parentRenderCount += 1;
      const [{ test }, { addValue }] = useModel(
				appModel,
				function(_state, views){
					return {
						test: views.test()
					}
				}
      );

      return (
        <div>
          <div id='test'>test:{test}</div>
          <button onClick={() => addValue()}>addValue</button>
          <SubApp />
        </div>
      );
    }

		act(() => {
			ReactDOM.render(
				<Provider>
					<App />
				</Provider>,
				node
			);
		});

		expect(parentRenderCount).toBe(1);
		expect(childRenderCount).toBe(1);


		expect(node.querySelector('#test')?.innerHTML).toEqual('test:3');
		expect(node.querySelector('#value')?.innerHTML).toEqual('value:1');

		act(() => {
			node
				.querySelector('#button')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});
		expect(parentRenderCount).toBe(2);
		expect(childRenderCount).toBe(2);
		expect(node.querySelector('#test')?.innerHTML).toEqual('test:4');
		expect(node.querySelector('#value')?.innerHTML).toEqual('value:2');

  });
});
