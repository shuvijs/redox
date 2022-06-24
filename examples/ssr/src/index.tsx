import React from 'react'
import { hydrateRoot } from 'react-dom/client'
import App from './App'
import { redox } from '@shuvi/redox'

let modelManager

if (window.clientEnv) {
	modelManager = redox({
		initialState: window.clientEnv,
	})
} else {
	modelManager = redox()
}

const container = document.getElementById('root')

hydrateRoot(
	container!,
	<React.StrictMode>
		<App modelManager={modelManager}></App>
	</React.StrictMode>
)
