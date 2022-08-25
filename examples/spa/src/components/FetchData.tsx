import * as React from 'react'
import { ModelSnapshot } from '@shuvi/redox'
import { useModel } from '@shuvi/redox-react'

import { fetchA, fetchB } from '../models/fetchData'

export type fetchAModelSnapshot = ModelSnapshot<typeof fetchA>
export type fetchBModelSnapshot = ModelSnapshot<typeof fetchB>

const fetchASelector = function (stateAndViews: fetchAModelSnapshot) {
  return {
    data: stateAndViews.data,
    isLoading: stateAndViews.isLoading,
  }
}

const fetchBSelector = function (stateAndViews: fetchBModelSnapshot) {
  return {
    data: stateAndViews.data,
    isLoading: stateAndViews.isLoading,
  }
}

function Fetch() {
  const [{ data: Adata, isLoading: isALoading }, { fetchAData }] = useModel(
    fetchA,
    fetchASelector
  )
  const [{ data: Bdata, isLoading: isBLoading }, { fetchBData }] = useModel(
    fetchB,
    fetchBSelector
  )
  return (
    <div>
      <h3>fetch example</h3>
      <div>
        <div>{isALoading ? 'A is loading' : JSON.stringify(Adata)}</div>
        <button onClick={() => fetchAData('string')}>fetchAData</button>
      </div>
      <div>
        <div>{isBLoading ? 'B is loading' : JSON.stringify(Bdata)}</div>
        <button onClick={() => fetchBData(1)}>fetchBData</button>
      </div>
      <hr />
    </div>
  )
}

export default Fetch
