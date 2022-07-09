import { AnyModel, ISelector, Store, ISelectorParams } from '@shuvi/redox'

type IActions<IModel extends AnyModel> = Store<IModel>['$actions']

export interface IUseModel {
	<IModel extends AnyModel>(model: IModel): [IModel['state'], IActions<IModel>]

	<IModel extends AnyModel, Selector extends ISelector<IModel>>(
		model: IModel,
		selectors: Selector
	): [ReturnType<Selector>, IActions<IModel>]
}

export interface IUseStaticModel {
	<IModel extends AnyModel>(model: IModel): [
		{ current: IModel['state'] },
		IActions<IModel>
	]

	<IModel extends AnyModel, Selector extends ISelector<IModel>>(
		model: IModel,
		selectors: Selector
	): [{ current: ReturnType<Selector> }, IActions<IModel>]
}

export type ModelSelector<model extends AnyModel> = (
	stateAndView: ISelectorParams<model>
) => any
