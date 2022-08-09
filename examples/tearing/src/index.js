import ReactDOM from 'react-dom/client'

import { RedoxRoot } from '@shuvi/redox-react'

import App from './App'
import { redoxStore } from './redox-store'

const rootElement = document.getElementById('root')
const root = ReactDOM.createRoot(rootElement)
root.render(
  <RedoxRoot redoxStore={redoxStore}>
    <App />
  </RedoxRoot>
)
