import { env, noteManager } from '../global'
import type { MimerNote } from './types/mimer-note'
import { mimiriPlatform } from './mimiri-platform'
import { emptyGuid, type Guid } from './types/guid'

class PersistedState {
	private scrollTops: { [key: Guid]: number } = {}

	constructor() {}

	private loadState(): any {
		if (this.enabled) {
			const state = localStorage.getItem(`mimiri-state-${noteManager.state.userId ?? emptyGuid()}`)
			if (state) {
				return JSON.parse(state)
			}
		}
		return {}
	}

	private saveState(state: any) {
		if (this.enabled) {
			localStorage.setItem(`mimiri-state-${noteManager.state.userId ?? emptyGuid()}`, JSON.stringify(state))
		}
	}

	clear() {
		if (this.enabled) {
			console.log(`Clearing persisted state for user ${noteManager.state.userId}`)
			localStorage.removeItem(`mimiri-state-${noteManager.state.userId}`)
		}
	}

	storeSelectedNote(note: MimerNote) {
		if (this.enabled) {
			const state = this.loadState()
			state.selectedNote = [note.id]
			let current = note.parent
			while (current && !current.isRoot) {
				state.selectedNote.push(current.id)
				current = current.parent
			}
			this.saveState(state)
		}
	}

	readSelectedNote() {
		if (this.enabled) {
			const state = this.loadState()
			return state.selectedNote ?? []
		}
		return []
	}

	expand(note: MimerNote) {
		if (this.enabled) {
			const state = this.loadState()
			if (!state.expanded) {
				state.expanded = []
			}
			if (state.expanded.indexOf(note.id) < 0) {
				state.expanded.push(note.id)
				this.saveState(state)
			}
		}
	}

	collapse(note: MimerNote) {
		if (this.enabled) {
			const state = this.loadState()
			if (state.expanded) {
				const index = state.expanded.indexOf(note.id)
				if (index >= 0) {
					state.expanded.splice(index, 1)
					this.saveState(state)
				}
			}
		}
	}

	getScrollTop(note: MimerNote) {
		if (this.enabled) {
			const state = this.loadState()
			return state.scrollTops?.[note.id] ?? 0
		} else {
			return this.scrollTops[note.id] ?? 0
		}
	}

	setScrollTop(note: MimerNote, value: number) {
		if (this.enabled) {
			const state = this.loadState()
			if (!state.scrollTops) {
				state.scrollTops = {}
			}
			state.scrollTops[note.id] = value
			this.saveState(state)
		} else {
			this.scrollTops[note.id] = value
		}
	}

	getTreeScrollTop() {
		if (this.enabled) {
			const state = this.loadState()
			return state.treeScrollTop ?? 0
		}
	}

	setTreeScrollTop(value: number) {
		if (this.enabled) {
			const state = this.loadState()
			state.treeScrollTop = value
			this.saveState(state)
		}
	}

	get expanded() {
		if (this.enabled) {
			const state = this.loadState()
			return state.expanded ?? []
		}
		return []
	}

	get enabled() {
		if (env.DEV) {
			return true
		}
		return !!localStorage && !mimiriPlatform.isWeb
	}

	get noteOpen() {
		if (this.enabled) {
			const state = this.loadState()
			return state.noteOpen ?? false
		}
		return false
	}

	set noteOpen(value: boolean) {
		if (this.enabled) {
			const state = this.loadState()
			state.noteOpen = value
			this.saveState(state)
		}
	}
}

export const persistedState = new PersistedState()
