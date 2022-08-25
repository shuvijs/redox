import React, { useState } from 'react'
import { defineModel, ModelSnapshot } from '@shuvi/redox'
import { useRootModel } from '@shuvi/redox-react'

class Foo {}

const data = {
  value: 1,
  value1: 1,
  anInstance: new Foo(),
  anArray: [3, 2, { c: 3 }, 1],
  // aMap: new Map([
  //   ['jedi', { name: 'Luke', skill: 10 }],
  //   ['jediTotal', 42],
  //   ['force', "these aren't the droids you're looking for"],
  // ]),
  // aSet: new Set([
  //   'Luke',
  //   42,
  //   {
  //     jedi: 'Yoda',
  //   },
  // ]),
  aProp: 'hi',
  anObject: {
    nested: {
      yummie: true,
    },
    coffee: false,
  },
}

const user = defineModel(
  {
    name: 'user',
    state: data,
    reducers: {
      add: (state, step: number = 1) => {
        state.value += step
      },
      add1: (state, step: number = 1) => {
        state.value1 += step
      },
    },
    views: {
      viewValue1() {
        console.log('viewValue1 computed')
        this.anObject.nested.yummie = false
        // @ts-ignore
        delete this.anObject.nested
        // @ts-ignore
        // this.anArray[2]['c'] = 6666
        // @ts-ignore
        // this.anArray[2] = {
        //   // @ts-ignore
        //   b: 1,
        // }
        // @ts-ignore
        // this.anObject.coffee1 = 'false'
        return this.value1
      },
      viewDome() {
        console.log('viewDome computed')
        // return this.$dep.domeDep.dome
      },
    },
  },
  []
)

export type userSelectorParameters = ModelSnapshot<typeof user>

export default function Views() {
  // const [index, setIndex] = useState(0)
  const [views, actions] = useRootModel(user)
  console.log(`render`)
  return (
    <div>
      <h1>Views</h1>
      <div>
        views automatic collect dependencies of state what it used. if state not
        changed, views will not be computed.
      </div>
      <div>
        <div>
          computed by 'state.value1',{' '}
          <strong>views.v: {views.viewValue1}</strong>
        </div>
        <hr />
      </div>
      <button
        onClick={() => {
          actions.add(1)
        }}
      >
        changed user value
      </button>
      <button
        onClick={() => {
          actions.add1(1)
        }}
      >
        changed user value1
      </button>
      <hr />
      {/* <div id="index">useState index: {index}</div>
      <button
        onClick={() => {
          setIndex(index + 1)
        }}
      >
        trigger useState
      </button> */}
      <hr />
    </div>
  )
}
