import {
  defineModel,
  redox,
  expectType,
  RedoxStore,
  ModelInstance,
  State,
} from './'

const redoxStore = redox()

expectType<RedoxStore>(redoxStore)

const model = defineModel({
  name: 'model',
  state: 0,
})

expectType<ModelInstance<typeof model>>(redoxStore.getModel(model))
expectType<void>(redoxStore.destroy())
expectType<{ [modelName: string]: State }>(redoxStore.getState())
expectType<() => void>(redoxStore.subscribe(model, () => {}))
