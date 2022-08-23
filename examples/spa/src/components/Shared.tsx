import * as React from 'react'
import { redox } from '@shuvi/redox'
import { LocalProviderA, LocalProviderB, A, B } from './use-shared-models'

const redoxStore0 = redox()
const redoxStore1 = redox()

function Shared() {
  let [data, setState] = React.useState(false)
  return (
    <>
      <button
        onClick={() => {
          setState(!data)
        }}
      >
        toggleredoxStore {data}
      </button>
      <LocalProviderA store={data ? redoxStore0 : redoxStore1}>
        <LocalProviderB store={data ? redoxStore0 : redoxStore1}>
          <A></A>
          <B></B>
        </LocalProviderB>
      </LocalProviderA>
    </>
  )
}

export default Shared
