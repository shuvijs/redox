import React, { useState } from 'react'
import { defineModel } from '@shuvi/redox'
import { useGlobalModel, ISelectorParams } from '@shuvi/redox-react'

const otherDep = defineModel({
	name: 'otherDep',
	state: {
		other: ['other'],
	},
	reducers: {
		add: (state, step: string = 'other') => {
			return {
				other: [...state.other, step],
			}
		},
	},
})

const domeDep = defineModel({
	name: 'domeDep',
	state: {
		dome: 0,
	},
	reducers: {
		add: (state, step: number = 1) => {
			state.dome += step
		},
	},
})

const user = defineModel(
	{
		name: 'user',
		state: {
			value: 1,
			value1: 1,
		},
		reducers: {
			add: (state, step: number = 1) => {
				state.value += step
			},
			add1: (state, step: number = 1) => {
				state.value1 += step
			},
		},
		views: {
			viewValue1(state) {
				console.log('viewValue1 computed')
				return state.value1
			},
			viewDome(_state, dependsState) {
				console.log('viewDome computed')
				return dependsState.domeDep.dome
			},
		},
	},
	[otherDep, domeDep]
)

export type userSelectorParameters = ISelectorParams<typeof user>

const selector = function (stateAndViews: userSelectorParameters) {
	return {
		v: stateAndViews.viewValue1(),
		d: stateAndViews.viewDome(),
	}
}

export default function Views() {
	const [index, setIndex] = useState(0)
	const [stateOther, actionsOther] = useGlobalModel(otherDep)
	const [stateDome, actionsDome] = useGlobalModel(domeDep)
	const [views, actions] = useGlobalModel(user, selector)

	return (
		<div>
			<h1>Views</h1>
			<div>
				views automatic collect dependencies of state what it used. if state not
				changed, views will not be computed.
			</div>
			<div>
				<div>
					computed by 'state.value1', <strong>views.v: {views.v}</strong>
				</div>
				<div>
					computed by 'dependsState.domeDep.dome',{' '}
					<strong>views.d: {views.d}</strong>
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
			{JSON.stringify(stateDome)}
			<hr />
			<button
				onClick={() => {
					actionsDome.add(1)
				}}
			>
				trigger dome actions
			</button>
			<hr />
			{JSON.stringify(stateOther)}
			<hr />
			<button
				onClick={() => {
					actionsOther.add()
				}}
			>
				trigger other actions
			</button>
			<div id="index">useState index: {index}</div>
			<button
				onClick={() => {
					setIndex(index + 1)
				}}
			>
				trigger useState
			</button>
			<hr />
		</div>
	)
}