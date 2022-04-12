import * as React from 'react'
import { useModel } from '../container'

import { test } from '../models/test'
import { count } from '../models/count'
import { list } from '../models/list'

function Count() {
	const [{ value }, { increment, incrementAsync }] = useModel(count);
	const [{ value: testString }, _] = useModel(test);
  const [{ arr }, { addContentAsync }] = useModel(list);
	const [inputValue, setInputValue] = React.useState('');
	return (
		<div>
			<h1>Test string form server</h1>
			<div>
				<h3>test: {testString}</h3>
			</div>
			<h1>Basic use</h1>
			<div style={{ width: 120 }}>
				<h3>count: {value}</h3>
				<button onClick={()=>increment(1)}>+1</button>
				<button onClick={incrementAsync}>Async +1</button>
			</div>
			<hr />
			<div style={{ width: 200 }}>
				<h3>has depends</h3>
				{ arr.map(item=>{
					return (<div key={item.id}>{`id:${item.id}-content:${item.content}`}</div>);
				})}
				<input 
          value={inputValue}
          onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setInputValue(e.target.value)}
        />
				<button onClick={()=> addContentAsync(inputValue)}>add content by input</button>
			</div>
			<hr />
		</div>
	)
}

export default Count;