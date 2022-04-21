import * as React from 'react'
import { useGlobalModel } from '@shuvi/redox-react'

import { login } from '../models/login'

function Login() {
	const [{ isLogin }, { toggleLogin }] = useGlobalModel(login)
	return (
		<div>
			<h3>isLogin: {isLogin.toString()}</h3>
			<button onClick={() => toggleLogin()}>toggleLogin</button>
			<hr />
		</div>
	)
}

export default Login
