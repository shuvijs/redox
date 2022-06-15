import ReactDOM from 'react-dom/client'

import { RedoxRoot } from '@shuvi/redox-react'

import App from './App'
import { modelManager } from './modelManager'

const rootElement = document.getElementById('root')
const root = ReactDOM.createRoot(rootElement)
root.render(
	<RedoxRoot modelManager={modelManager}>
		<App />
	</RedoxRoot>
)
