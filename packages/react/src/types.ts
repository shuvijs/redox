import { Model, Store } from '@shuvi/redox';

export type AnyModel = Model<any, any, any, any, any, any>

export type ISelector<
	IModel extends AnyModel,
> = (state: ReturnType<Store<IModel>['getState']>, views:  Store<IModel>['views']) => any;

export interface IUseModel {
	<IModel extends AnyModel>(
		model: IModel
	): [ReturnType<Store<IModel>['getState']>, Store<IModel>['dispatch']];

	<IModel extends AnyModel, Selector extends ISelector<IModel>>(
		model: IModel,
		selectors: Selector
	): [ReturnType<Selector>, Store<IModel>['dispatch']];
}
