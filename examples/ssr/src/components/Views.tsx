import React, { useState } from 'react';
import { defineModel } from '@shuvi/redox'
import { useModel, ISelector } from '../container'

const other = defineModel({
  name: 'other',
  state: {
    other: ['other']
  },
  reducers: {
    add: (state, step) => {
      return {
        ...state,
        other: [...state.other, step]
      };
    }
  }
});

const dome = defineModel({
  name: 'dome',
  state: {
    number: 0
  },
  reducers: {
    add: (state, step: number) => {
      state.number = step;
    }
  }
});

const user = defineModel(
  {
    name: 'user1',
    state: {
      id: 1,
      name: 'haha'
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
      }
    },
    views: {
      d (state, dependsState): {number: number} {
        console.log(state.id);
        const a = dependsState.other;
        console.log(dependsState.dome.number);
        console.log(a.other[0]);
        console.log('d computed');
        return dependsState.dome;
      },
      one (_state, dependsState): number{
        return dependsState.dome.number;
      },
      double (state, _dependsState, args): string {
        // console.log('views', state, rootState, views, args);
        // console.log('this', this)
        // console.log('this', views.one)
        // return state.id * args;
        console.log('double computed');
        return `state.id=>${state.id}, args=>${args},views.one=>${this.one}`;
      }
    }
  },
  [ other, dome ]
);

const selector:ISelector<typeof user> = function (state, views) {
  console.log('call selector'); 
  return {
    stateData: state.id,
    one: views.one(),
    double: views.double(3),
    d: views.d().number
  };
};

export default function Views() {
  const [index, setIndex] = useState(0);
  const [stateOther, actionsOther] = useModel(other);
  const [stateDome, actionsDome] = useModel(dome);
  const [views, actions] = useModel(user, selector);

  return (
    <div>
      <h1>Views</h1>
      <div>views automatic collect dependencies of state what it used. if state not changed, views will not be computed.</div>
      <div>
        <div>views.double: {views.double}</div>
        <div>views.one: {views.one}</div>
        <div>views.d: {views.d}</div>
        <hr />
      </div>
      <button
        onClick={() => {
          actions.add(2);
        }}
      >
      trigger user actions
      </button>
      <hr />
      {JSON.stringify(stateDome)}
      <hr />
      <button
        onClick={() => {
          actionsDome.add(1);
        }}
      >
      trigger dome actions
      </button>
      <hr />
      {JSON.stringify(stateOther)}
      <hr />
      <button
        onClick={() => {
          actionsOther.add(1);
        }}
      >
      trigger other actions
      </button>
      <div id="index">useState index: {index}</div>
      <button
        onClick={() => {
          setIndex(index + 1);
        }}
      >
        trigger useState
      </button>
      <hr />
      <div>
        <button
          onClick={() => {
            actions.depends('');
          }}
        >
          trigger depends
        </button>
      </div>
    </div>
  );
}
