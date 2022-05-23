import * as React from 'react'
import { useRootStaticModel } from '../Container'

import { login } from '../models/login'

function Login() {
	// not support Destructuring Assignment
	const [state] = useRootStaticModel(login)
	return (
		<div>
			<h3>useRootStaticModel isLogin: {state.isLogin.toString()}</h3>
			<button onClick={() => alert(state.isLogin)}>alert isLogin</button>
			<hr />
		</div>
	)
}

export default Login
