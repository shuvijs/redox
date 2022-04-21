import * as React from 'react'
import { redox } from '@shuvi/redox'

const modelManager = redox()

import { LocalProviderA, LocalProviderB, A, B, C } from './Isolation'

function Shared() {
	return (
		<LocalProviderA modelManager={modelManager}>
			<LocalProviderB modelManager={modelManager}>
				<A></A>
				<B></B>
			</LocalProviderB>
		</LocalProviderA>
	)
}

export default Shared
