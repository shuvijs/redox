import * as React from 'react'
import { useModel } from '@shuvi/redox-react'

import { count } from '../models/count'

function Count() {
	const [{ value }, { add, addAsync }] = useModel(count)
	return (
		<div>
			<h1>useModel basic use</h1>
			<div>
				<h3>count: {value}</h3>
				<button onClick={() => add(1)}>Immer reducer +1</button>
				<button onClick={addAsync}>Async effect +1</button>
			</div>
			<hr />
		</div>
	)
}

export default Count
