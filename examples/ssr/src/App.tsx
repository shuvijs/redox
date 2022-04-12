import React from 'react'
import Basic from './components/Basic'
import Views from './components/Views'
import Local from './components/Local'
import { Provider } from './container'
import type { IModelManager } from '@shuvi/redox'

function App(props: { modelManager: IModelManager }) {
	return (
		<>
			<Provider {...props}>
				<Basic />
				<Views />
				<Local />
			</Provider>
		</>
	)
}

export default App
