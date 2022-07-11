import { AnyModel, ISelector, Store, ISelectorParams } from '@shuvi/redox'

type IActions<IModel extends AnyModel> = Store<IModel>['$actions']

export interface IUseModel {
	<IModel extends AnyModel>(model: IModel): [
		ISelectorParams<IModel>,
		IActions<IModel>
	]

	<IModel extends AnyModel, Selector extends ISelector<IModel>>(
		model: IModel,
		selectors: Selector,
		depends?: any[]
	): [ReturnType<Selector>, IActions<IModel>]
}

export interface IUseStaticModel {
	<IModel extends AnyModel>(model: IModel): [
		{ current: ISelectorParams<IModel> },
		IActions<IModel>
	]

	<IModel extends AnyModel, Selector extends ISelector<IModel>>(
		model: IModel,
		selectors: Selector,
		depends?: any[]
	): [{ current: ReturnType<Selector> }, IActions<IModel>]
}
