import * as React from 'react'
import { createContainer } from '@shuvi/redox-react'

import { count } from '../models/count'

const { Provider: LocalProviderA, useSharedModel: useSharedModelA } =
	createContainer()
const { Provider: LocalProviderB, useSharedModel: useSharedModelB } =
	createContainer()

const C = () => {
	const [stateA, _actionsA] = useSharedModelA(count)
	const [stateB, _actionsB] = useSharedModelB(count)

	return (
		<>
			<div id="stateCA">stateCA: {stateA.value}</div>
			<div id="stateCB">stateCB: {stateB.value}</div>
		</>
	)
}

const A = () => {
	const [state, actions] = useSharedModelA(count)

	return (
		<>
			<div id="stateA">stateA: {state.value}</div>
			<button id="buttonA" type="button" onClick={() => actions.add(1)}>
				A add
			</button>
			<C></C>
		</>
	)
}

const B = () => {
	const [state, actions] = useSharedModelB(count)

	return (
		<>
			<div id="stateB">stateB: {state.value}</div>
			<button id="buttonB" type="button" onClick={() => actions.add(1)}>
				B add
			</button>
			<C></C>
		</>
	)
}

function Isolation() {
	return (
		<LocalProviderA>
			<LocalProviderB>
				<A></A>
				<B></B>
			</LocalProviderB>
		</LocalProviderA>
	)
}

export { LocalProviderA, LocalProviderB, A, B, C }

export default Isolation
