import * as React from 'react'
import { redox } from '@shuvi/redox'
import { LocalProviderA, LocalProviderB, A, B, C } from './Isolation'

const modelManager0 = redox()
const modelManager1 = redox()

function Shared() {
	let [data, setState] = React.useState(false)
	return (
		<>
			<button
				onClick={() => {
					setState(!data)
				}}
			>
				toggleModelManager {data}
			</button>
			<LocalProviderA modelManager={data ? modelManager0 : modelManager1}>
				<LocalProviderB modelManager={data ? modelManager0 : modelManager1}>
					<A></A>
					<B></B>
				</LocalProviderB>
			</LocalProviderA>
		</>
	)
}

export default Shared
