import * as React from 'react'
import { useGlobalModel, ISelectorParams } from '@shuvi/redox-react'

import { login, currentUser } from '../models/login'

type currentUserSelectorParams = ISelectorParams<typeof currentUser>

const currentUserSelector = function (
	stateAndViews: currentUserSelectorParams
) {
	return {
		userInfo: stateAndViews.userInfo(),
	}
}

function Login() {
	const [{ isLogin }, { toggleLogin }] = useGlobalModel(login)
	const [{ userInfo }, _] = useGlobalModel(currentUser, currentUserSelector)
	return (
		<div>
			<h3>
				useGlobalModel isLogin: {isLogin.toString()}, currentUser: {userInfo}
			</h3>
			<button onClick={() => toggleLogin()}>toggleLogin</button>
			<hr />
		</div>
	)
}

export default Login
