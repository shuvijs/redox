import { RedoxStore, AnyModel } from '@shuvi/redox'

type noExist = { [X: string | number | symbol]: never }

export type ISelector<IModel extends AnyModel> = (
	state: ReturnType<RedoxStore<IModel>['$state']>,
	views: RedoxStore<IModel>['$views']
) => any

export interface IUseModel {
	<IModel extends AnyModel>(model: IModel): [
		ReturnType<RedoxStore<IModel>['$state']>,
		RedoxStore<IModel>['$actions']
	]

	<IModel extends AnyModel, Selector extends ISelector<IModel>>(
		model: IModel,
		selectors: Selector
	): [ReturnType<Selector>, RedoxStore<IModel>['$actions']]
}
