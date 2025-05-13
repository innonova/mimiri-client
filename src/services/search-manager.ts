import { reactive } from 'vue'
import { noteManager, showSearchBox } from '../global'
import type { Guid } from './types/guid'
import type { MimerNote } from './types/mimer-note'

export enum FoundType {
	Found = 'found',
	ParentOfFound = 'parent-of-found',
}

interface SearchState {
	searchActive: boolean
	searchRunning: boolean
	notes: { [key: Guid]: FoundType }
	term: string
}

class SearchManager {
	public state: SearchState = reactive({
		searchActive: false,
		searchRunning: false,
		notes: {},
		term: '',
	})

	public updateTerm(text: string) {
		if (!this.state.searchRunning) {
			this.state.term = text.trim()
		}
	}

	public search(text: string) {
		if (!text.trim()) {
			this.state.searchActive = false
			this.state.searchRunning = false
			this.state.term = ''
			this.state.notes = {}
			showSearchBox.value = false
			return
		}
		this.state.searchActive = true
		this.state.notes = {}
		this.state.term = text
		const notes = this.state.notes
		this.state.searchRunning = true

		let first = true
		noteManager.root
			.search(text, (note: MimerNote) => {
				if (first) {
					note.select()
					first = false
				}
				notes[note.id] = FoundType.Found
				let current = note.parent
				while (current) {
					if (!notes[current.id]) {
						notes[current.id] = FoundType.ParentOfFound
					}
					current = current.parent
				}
			})
			.then(() => {
				this.state.searchRunning = false
			})
	}

	public isNoteFound(id: Guid) {
		if (!this.state.searchActive) {
			return true
		}
		const foundType = this.state.notes[id]
		if (foundType === FoundType.Found) {
			return true
		}
		return false
	}

	public isChildFound(id: Guid) {
		if (!this.state.searchActive) {
			return true
		}
		const foundType = this.state.notes[id]
		if (foundType === FoundType.ParentOfFound) {
			return true
		}
		return false
	}
}

export const searchManager = new SearchManager()
