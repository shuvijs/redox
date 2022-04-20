import { RedoxStore, AnyModel } from '@shuvi/redox'

type noExist = { [X: string | number | symbol]: never }

type IState<IModel extends AnyModel> = ReturnType<
	RedoxStore<IModel>['$state']
> &
	noExist
type IViews<IModel extends AnyModel> = RedoxStore<IModel>['$views'] & noExist
type IActions<IModel extends AnyModel> = RedoxStore<IModel>['$actions']

export type ISelector<IModel extends AnyModel, TReturn = any> = (
	...args: ISelectorParams<IModel>
) => TReturn

export type ISelectorParams<IModel extends AnyModel> = [
	IState<IModel>,
	IViews<IModel>
]

export interface IUseModel {
	<IModel extends AnyModel>(model: IModel): [IState<IModel>, IActions<IModel>]

	<IModel extends AnyModel, Selector extends ISelector<IModel>>(
		model: IModel,
		selectors: Selector
	): [ReturnType<Selector>, IActions<IModel>]
}
