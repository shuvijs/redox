import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'
import { RootProvider } from '@shuvi/redox-react'

ReactDOM.render(
	<RootProvider>
		<App></App>
	</RootProvider>,
	document.getElementById('root')
)
