import { AnyModel } from './defineModel'
import { Views, EmptyObject } from './modelOptions'
import { ModelInternal } from './model'

export type SelectorParams<Model extends AnyModel> = {
  $state: Model['state']
} & Model['state'] &
  Views<Model['views']> &
  EmptyObject

export type Selector<Model extends AnyModel, TReturn = any> = (
  stateAndViews: SelectorParams<Model>
) => TReturn

export function createSelector<IModel extends AnyModel, TReturn>(
  instance: ModelInternal<IModel>,
  selector: Selector<IModel, TReturn>
) {
  const view = instance.createView(function (this: any) {
    return selector(this)
  })

  const res = function () {
    return view.value
  }
  res.clearCache = function () {
    view.effect.stop()
    const index = instance.effectScope.effects.indexOf(view.effect)
    if (index >= 0) {
      instance.effectScope.effects.splice(index, 1)
    }
  }
  return res
}
