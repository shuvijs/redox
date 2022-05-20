import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'
import { redox } from '@shuvi/redox'
import redoxLog from '@shuvi/redox-log'
import persist, { localStorage } from '@shuvi/redox-persist'
import { RedoxRoot } from './Container'

const modelManager = redox({
	initialState: {},
	plugins: [
		[redoxLog],
		[
			persist,
			{
				key: 'root',
				storage: localStorage,
				// whitelist: ['b'],
				blacklist: ['b'],
				migrate: function (storageState: any, version: number) {
					console.log('migrate version: ', version)
					console.log('migrate storageState: ', storageState)
					const count = storageState.count
					if (count.value >= 3) {
						count.value = 2
					}
					return storageState
				},
			},
		],
	],
})

ReactDOM.render(
	<RedoxRoot modelManager={modelManager}>
		<App></App>
	</RedoxRoot>,
	document.getElementById('root')
)
