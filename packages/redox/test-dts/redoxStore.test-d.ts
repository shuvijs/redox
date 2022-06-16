import { defineModel, redox, expectType, IModelManager, Store, State } from './'

const manager = redox()

expectType<IModelManager>(manager)

const model = defineModel({
	name: 'model',
	state: 0,
})

expectType<Store<typeof model>>(manager.get(model))
expectType<void>(manager.destroy())
expectType<{ [modelName: string]: State }>(manager.getSnapshot())
expectType<() => void>(manager.subscribe(model, () => {}))
expectType<State>(manager._getInitialState(model.name!))
