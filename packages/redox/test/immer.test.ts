import { defineModel, redox } from '../src'
let manager: ReturnType<typeof redox>

describe('immer', () => {
	beforeEach(() => {
		manager = redox()
	})
	test('should load the immer plugin with a basic literal', () => {
		const count = defineModel({
			name: 'count',
			state: { value: 0},
			reducers: {
				add(state) {
					state.value = state.value + 1
				},
			},
		})

		const store = manager.get(count)

		store.dispatch({ type: 'add' })

		expect(store.getState()).toEqual({value: 1})
	})

	test('should load the immer plugin with a nullable basic literal', () => {
		const model = defineModel({
			name: 'model',
			state: { value: null } as {value: number | null},
			reducers: {
				set(state, payload: number) {
					state.value = payload;
				},
			},
		})

		const store = manager.get(model)

		store.dispatch({ type: 'set', payload: 1 })

		expect(store.getState()).toEqual({value: 1})
	})

	test('should load the immer plugin with a object condition', () => {
		const todo = [
			{
				todo: 'Learn typescript',
				done: true,
			},
			{
				todo: 'Try immer',
				done: false,
			},
		]
		const todoModel = defineModel({
			name: 'todo',
			state: todo,
			reducers: {
				done(state: any): any {
					state.push({ todo: 'Tweet about it' })
					state[1].done = true
					return state
				},
			},
		})

		const store = manager.get(todoModel)

		store.dispatch({ type: 'done' })
		const newState = store.getState()

		expect(todo.length).toBe(2)
		expect(newState).toHaveLength(3)

		expect(todo[1].done).toBe(false)
		expect(newState[1].done).toEqual(true)
	})

})
