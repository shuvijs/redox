import React from 'react'
import { hydrateRoot } from 'react-dom/client'
import App from './App'
import { redox } from '@shuvi/redox'

let redoxStore

if (window.clientEnv) {
  redoxStore = redox({
    initialState: window.clientEnv,
  })
} else {
  redoxStore = redox()
}

const container = document.getElementById('root')

hydrateRoot(
  container!,
  <React.StrictMode>
    <App store={redoxStore}></App>
  </React.StrictMode>
)
