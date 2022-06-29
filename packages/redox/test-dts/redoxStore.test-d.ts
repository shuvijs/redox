import { defineModel, redox, expectType, IStoreManager, Store, State } from './'

const manager = redox()

expectType<IStoreManager>(manager)

const model = defineModel({
	name: 'model',
	state: 0,
})

expectType<Store<typeof model>>(manager.get(model))
expectType<void>(manager.destroy())
expectType<{ [modelName: string]: State }>(manager.getState())
expectType<() => void>(manager.subscribe(model, () => {}))
