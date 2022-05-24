import React from 'react'
import Basic from './components/Basic'
import { persistModel } from '@shuvi/redox-persist'
import { useRootModel } from './Container'

function App() {
	const [{ rehydrated }] = useRootModel(persistModel)
	return (
		<>
			{rehydrated ? (
				<>
					<Basic />
				</>
			) : (
				'isLoading'
			)}
		</>
	)
}

export default App
