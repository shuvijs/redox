import { RedoxStore, AnyModel } from '@shuvi/redox'

type noExist = { [X: string | number | symbol]: never }

type IState<IModel extends AnyModel> = ReturnType<RedoxStore<IModel>['$state']>

type IViews<IModel extends AnyModel> = RedoxStore<IModel>['$views']
type IActions<IModel extends AnyModel> = RedoxStore<IModel>['$actions']

export type ISelector<IModel extends AnyModel, TReturn = any> = (
	stateAndViews: ISelectorParams<IModel>
) => TReturn

export type ISelectorParams<IModel extends AnyModel> = {
	$state: () => IModel['state']
} & IState<IModel> &
	IViews<IModel> &
	noExist

export interface IUseModel {
	<IModel extends AnyModel>(model: IModel): [IState<IModel>, IActions<IModel>]

	<IModel extends AnyModel, Selector extends ISelector<IModel>>(
		model: IModel,
		selectors: Selector
	): [ReturnType<Selector>, IActions<IModel>]
}

export interface IUseStaticModel {
	<IModel extends AnyModel>(model: IModel): [
		{ current: IState<IModel> },
		IActions<IModel>
	]

	<IModel extends AnyModel, Selector extends ISelector<IModel>>(
		model: IModel,
		selectors: Selector
	): [{ current: ReturnType<Selector> }, IActions<IModel>]
}
