import React from 'react'
import { RootProvider } from '@shuvi/redox-react'
import SSR from './components/SSR'
import Basic from './components/Basic'
import Views from './components/Views'
import List from './components/List'
import Repeat from './components/Repeat'
import type { IModelManager } from '@shuvi/redox'

function App(props: { modelManager?: IModelManager }) {
	return (
		<>
			<RootProvider {...props}>
				<SSR />
				<Basic />
				<Views />
				<List />
				<Repeat />
			</RootProvider>
		</>
	)
}

export default App
