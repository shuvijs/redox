import {
  AnyModel,
  Selector,
  ModelPublicInstance,
  SelectorParams,
} from '@shuvi/redox'

type IActions<IModel extends AnyModel> = ModelPublicInstance<IModel>['$actions']

export interface IUseModel {
  <IModel extends AnyModel>(model: IModel): [
    SelectorParams<IModel>,
    IActions<IModel>
  ]

  <IModel extends AnyModel, S extends Selector<IModel>>(
    model: IModel,
    selectors: S,
    depends?: any[]
  ): [ReturnType<S>, IActions<IModel>]
}

export interface IUseStaticModel {
  <IModel extends AnyModel>(model: IModel): [
    { current: SelectorParams<IModel> },
    IActions<IModel>
  ]

  <IModel extends AnyModel, S extends Selector<IModel>>(
    model: IModel,
    selectors: S,
    depends?: any[]
  ): [{ current: ReturnType<S> }, IActions<IModel>]
}
