import React from 'react'
import { hydrateRoot } from 'react-dom/client'
import App from './App'
import { redox } from '@shuvi/redox'

let storeManager

if (window.clientEnv) {
	storeManager = redox({
		initialState: window.clientEnv,
	})
} else {
	storeManager = redox()
}

const container = document.getElementById('root')

hydrateRoot(
	container!,
	<React.StrictMode>
		<App storeManager={storeManager}></App>
	</React.StrictMode>
)
