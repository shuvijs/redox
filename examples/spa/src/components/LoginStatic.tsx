import * as React from 'react'
import { useStaticModel } from '@shuvi/redox-react'

import { login } from '../models/login'

function Login() {
	// not support Destructuring Assignment
	const [state] = useStaticModel(login)
	return (
		<div>
			<h3>useStaticModel isLogin: {state.isLogin.toString()}</h3>
			<button onClick={() => alert(state.isLogin)}>alert isLogin</button>
			<hr />
		</div>
	)
}

export default Login
