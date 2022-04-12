import { defineModel } from '@shuvi/redox'
import {id} from '../dependsModels/id'

type item = {
	id: number,
	content: string
}

export const list = defineModel({
	name: 'list',
	state: {
		arr: [
			{
				id: 0,
				content: 'default 0'
			},
			{
				id: 1,
				content: 'default 1'
			}
		],
	},
	reducers: {
		addList(state, payload: Partial<item> & {content: string}) {
			state.arr.push({
				id: state.arr.length + 1,
				content: payload.content
			})
			return state;
		},
	},
	effects: {
		async addContentAsync(payload: string, state, depends) {
			const { getState, dispatch: { id } } = depends;
			await id.incrementAsync(getState().id.id+1);
			const tempId = getState().id.id;
			this.addList({ content: `${payload}-id:${tempId}` });
		}
	},
}, [id])
