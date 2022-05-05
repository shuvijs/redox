import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'
import { RedoxRoot } from '@shuvi/redox-react'

ReactDOM.render(
	<RedoxRoot>
		<App></App>
	</RedoxRoot>,
	document.getElementById('root')
)
