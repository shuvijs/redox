import React from 'react'
import ReactDOM from 'react-dom'
import App from './App';
import { redox } from '@shuvi/redox'

let modelManager;

if(window.clientEnv){
	modelManager = redox(window.clientEnv);
}else{
	modelManager = redox()
}

ReactDOM.render(
	<React.StrictMode>
		<App modelManager={modelManager}></App>
	</React.StrictMode>,
	document.getElementById('root')
)
