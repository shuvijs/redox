import * as React from 'react'
import { redox } from '@shuvi/redox'
import { LocalProviderA, LocalProviderB, A, B } from './useSharedModels'

const storeManager0 = redox()
const storeManager1 = redox()

function Shared() {
	let [data, setState] = React.useState(false)
	return (
		<>
			<button
				onClick={() => {
					setState(!data)
				}}
			>
				togglestoreManager {data}
			</button>
			<LocalProviderA storeManager={data ? storeManager0 : storeManager1}>
				<LocalProviderB storeManager={data ? storeManager0 : storeManager1}>
					<A></A>
					<B></B>
				</LocalProviderB>
			</LocalProviderA>
		</>
	)
}

export default Shared
