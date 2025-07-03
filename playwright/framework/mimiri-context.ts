import { AsyncLocalStorage } from 'async_hooks'
import { MimiriState } from './mimiri-state'

interface MiStore {
	state: MimiriState[]
	active: number
}

const asyncLocalStorage = new AsyncLocalStorage()

export const withMimiriContext = async (runner: () => Promise<void>) => {
	const store: MiStore = { state: [new MimiriState()], active: 0 }
	await store.state[0].init(0)
	try {
		await asyncLocalStorage.run(store, runner)
	} finally {
		for (const state of store.state) {
			await state.terminate()
		}
	}
}

export const mimiri = (no?: number, setActive?: boolean) => {
	const store = asyncLocalStorage.getStore() as MiStore
	if (setActive) {
		store.active = no ?? 0
	}
	return store.state[no ?? store.active]
}

export const mimiriCreate = async (setActive?: boolean) => {
	const store = asyncLocalStorage.getStore() as MiStore
	store.state.push(new MimiriState())
	await store.state[store.state.length - 1].init(store.state.length - 1)
	if (setActive) {
		store.active = store.state.length - 1
	}
	return store.state[store.state.length - 1]
}

export const mimiriClone = async (setActive?: boolean) => {
	const store = asyncLocalStorage.getStore() as MiStore
	store.state.push(store.state[store.active].clone())
	await store.state[store.state.length - 1].init(store.state.length - 1)
	if (setActive) {
		store.active = store.state.length - 1
	}
	return store.state[store.state.length - 1]
}
