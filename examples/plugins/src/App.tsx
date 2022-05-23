import React from 'react'
import Basic from './components/Basic'

function App() {
	const [show, setShow] = React.useState(true)
	return (
		<>
			{show ? (
				<>
					<Basic />
				</>
			) : null}
		</>
	)
}

export default App
