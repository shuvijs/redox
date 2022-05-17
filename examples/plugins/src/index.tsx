import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'
import { redox } from '@shuvi/redox'
import { RedoxRoot } from '@shuvi/redox-react'
import redoxLog from '@shuvi/redox-log'
import persist, { localStorage } from '@shuvi/redox-persist'

const modelManager = redox({}, [
	[redoxLog, undefined],
	[
		persist,
		{
			key: 'root',
			storage: localStorage,
		},
	],
])

ReactDOM.render(
	<RedoxRoot modelManager={modelManager}>
		<App></App>
	</RedoxRoot>,
	document.getElementById('root')
)
