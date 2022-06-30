import ReactDOM from 'react-dom/client'

import { RedoxRoot } from '@shuvi/redox-react'

import App from './App'
import { storeManager } from './storeManager'

const rootElement = document.getElementById('root')
const root = ReactDOM.createRoot(rootElement)
root.render(
	<RedoxRoot storeManager={storeManager}>
		<App />
	</RedoxRoot>
)
