import React from 'react'
import { Provider } from '@shuvi/redox-react'
import SSR from './components/SSR'
import Basic from './components/Basic'
import Views from './components/Views'
import List from './components/List'
import Repeat from './components/Repeat'
import type { IModelManager } from '@shuvi/redox'

function App(props: { modelManager: IModelManager }) {
	return (
		<>
			<Provider {...props}>
				<SSR />
				<Basic />
				<Views />
				<List />
				<Repeat />
			</Provider>
		</>
	)
}

export default App
