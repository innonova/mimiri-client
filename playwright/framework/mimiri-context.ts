import { AsyncLocalStorage } from 'async_hooks'
import { MimiriState } from './mimiri-state'

interface MiStore {
	state: MimiriState
}

const asyncLocalStorage = new AsyncLocalStorage()

export const withMimiriContext = async (runner: () => Promise<void>) => {
	const store: MiStore = { state: new MimiriState() }
	await store.state.init()
	try {
		await asyncLocalStorage.run(store, runner)
	} finally {
		await store.state.terminate()
	}
}

export const mimiri = () => {
	const store = asyncLocalStorage.getStore() as MiStore
	return store.state
}
