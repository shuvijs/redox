import ReactDOM from 'react-dom/client'

import App from './App'
import { RedoxRoot, modelManger } from './Container'

const rootElement = document.getElementById('root')
const root = ReactDOM.createRoot(rootElement)
root.render(
	<RedoxRoot modelManager={modelManger}>
		<App />
	</RedoxRoot>
)
