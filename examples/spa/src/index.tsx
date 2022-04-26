import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'
import { Provider } from '@shuvi/redox-react'

ReactDOM.render(
	// @ts-ignore
	<Provider p="global">
		<App></App>
	</Provider>,
	document.getElementById('root')
)
