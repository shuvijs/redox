import * as React from 'react'
import { useModel } from '@shuvi/redox-react'

import { count } from '../models/count'

function Count() {
	const [{ value }, { increment, incrementAsync }] = useModel(count)
	return (
		<div>
			<h1>useModel basic use</h1>
			<div>
				<h3>count: {value}</h3>
				<button onClick={() => increment(1)}>Immer reducer +1</button>
				<button onClick={incrementAsync}>Async effect +1</button>
			</div>
			<hr />
		</div>
	)
}

export default Count
