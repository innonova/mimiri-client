import type { Guid } from '../types/guid'
import type { MimerNote } from '../types/mimer-note'
import { ViewMode, type SharedState } from './type'
import { persistedState } from '../persisted-state'
import { browserHistory } from '../../global'
import { mimiriPlatform } from '../mimiri-platform'

export interface ActionListener {
	select(id: Guid)
}

export class NoteTreeManager {
	private _root: MimerNote
	private notes: { [id: Guid]: MimerNote } = {}
	private _actionListeners: ActionListener[] = []
	private _isMobile: boolean

	constructor(private sharedState: SharedState) {
		this._isMobile = mimiriPlatform.isPhoneSize
	}

	public register(id: Guid, note: MimerNote) {
		this.notes[id] = note
	}

	public getNoteById(id: Guid) {
		if (id) {
			return this.notes[id]
		}
		return undefined
	}

	public getViewModelById(id: Guid) {
		if (id && this.notes[id]) {
			return this.notes[id].viewModel
		}
		return undefined
	}

	public select(id: Guid) {
		this.sharedState.selectedNoteId = id
		if (!this._isMobile) {
			browserHistory.open(id)
		}
		this.emitSelected(id)
	}

	public openNote(id?: Guid, mobileOpen = true) {
		const note = id ? this.getNoteById(id) : this.selectedNote
		if (note) {
			note.select()
			this.sharedState.viewMode = ViewMode.Content
			if (this._isMobile && mobileOpen) {
				this.sharedState.noteOpen = true
				persistedState.noteOpen = true
				browserHistory.open(this.sharedState.selectedNoteId)
			}
		}
	}

	public openProperties(id?: Guid) {
		const note = id ? this.getNoteById(id) : this.selectedNote
		if (note) {
			note.select()
			this.sharedState.viewMode = ViewMode.Properties
			if (this._isMobile) {
				this.sharedState.noteOpen = true
				persistedState.noteOpen = true
				browserHistory.open(this.sharedState.selectedNoteId)
			}
		}
	}

	public async loadState(rootNote: MimerNote) {
		const selectedList = persistedState.readSelectedNote()
		const expanded = persistedState.expanded
		await rootNote.ensureChildren()

		if (expanded) {
			let maxIterations = 1000
			while (expanded.length > 0 && --maxIterations > 0) {
				for (let i = 0; i < expanded.length; i++) {
					const note = this.getNoteById(expanded[i])
					if (note) {
						await note.expand()
						expanded.splice(i, 1)
						break
					}
				}
			}
		}

		if (selectedList) {
			let maxIterations = 1000
			while (selectedList.length > 0 && --maxIterations > 0) {
				const note = this.getNoteById(selectedList.pop())
				if (selectedList.length === 0) {
					note?.select()
				}
			}
		}
		this.sharedState.stateLoaded = true
	}

	public registerActionListener(listener: ActionListener) {
		this._actionListeners.push(listener)
	}

	private emitSelected(id: Guid) {
		for (const listener of this._actionListeners) {
			listener.select(id)
		}
	}

	public get selectedNote() {
		return this.getNoteById(this.sharedState.selectedNoteId)
	}

	public get selectedViewModel() {
		return this.getViewModelById(this.sharedState.selectedNoteId)
	}

	public clearNotes() {
		this.notes = {}
	}

	public get root() {
		return this._root
	}

	public set root(value: MimerNote) {
		this._root = value
	}

	public get controlPanel() {
		return this._root?.children.find(child => child.id === this._root.note.getItem('metadata').controlPanel)
	}

	public get recycleBin() {
		return this._root?.children.find(child => child.id === this._root.note.getItem('metadata').recycleBin)
	}
}
