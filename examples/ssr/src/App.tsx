import React from 'react'
import { RedoxRoot } from '@shuvi/redox-react'
import SSR from './components/SSR'
import Basic from './components/Basic'
import Views from './components/Views'
import List from './components/List'
import Repeat from './components/Repeat'
import type { IModelManager } from '@shuvi/redox'

function App(props: { modelManager?: IModelManager }) {
	return (
		<>
			<RedoxRoot {...props}>
				<SSR />
				<Basic />
				<Views />
				<List />
				<Repeat />
			</RedoxRoot>
		</>
	)
}

export default App
