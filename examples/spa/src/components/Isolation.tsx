// @ts-nocheck
import * as React from 'react'
import { LocalProviderA, LocalProviderB, A, B } from './useSharedModels'

function Isolation() {
	return (
		<LocalProviderA p="A">
			<LocalProviderB p="B">
				<A></A>
				<B></B>
			</LocalProviderB>
		</LocalProviderA>
	)
}

export default Isolation
