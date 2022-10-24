import { Plugin } from '@shuvi/redox'

const redoxLog: Plugin = function () {
  return {
    onModelInstance(instance) {
      const originDispatch = instance.dispatch
      instance.dispatch = function (action) {
        console.log('action: ', action)
        const res = originDispatch(action)
        console.log('$state :', instance.getState())
        return res
      }
    },
  }
}

export default redoxLog
