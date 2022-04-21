import React from 'react'
import Login from './components/Login'
import ListA from './components/ListA'
import ListB from './components/ListB'
import Isolation from './components/Isolation'
import Shared from './components/Shared'

function App() {
	const [show, setShow] = React.useState(true)
	return (
		<>
			<button onClick={() => setShow(!show)}>toggle unmount</button>
			<hr />
			{show ? (
				<>
					<Login />
					<ListA />
					<ListB />
					<h3>Isolation useSharedModel</h3>
					<Isolation></Isolation>
					<hr />
					<h3>Shared useSharedModel</h3>
					<Shared></Shared>
				</>
			) : null}
		</>
	)
}

export default App
