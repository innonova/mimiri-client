import { computed, ref } from 'vue'
import type { Guid } from '../types/guid'
import { MimerNote } from '../types/mimer-note'
import { ViewMode, type SharedState } from './type'
import { persistedState } from '../persisted-state'
import { browserHistory } from '../../global'
import { mimiriPlatform } from '../mimiri-platform'
import type { NoteService } from './note-service'
import type { AuthenticationManager } from './authentication-manager'

export interface ActionListener {
	select(id: Guid)
}

export class NoteTreeManager {
	private _root = ref<MimerNote>()
	private notes: { [id: Guid]: MimerNote } = {}
	private _actionListeners: ActionListener[] = []
	private _isMobile: boolean

	constructor(
		private owner: any,
		private state: SharedState,
		private noteService: NoteService,
		private authManager: AuthenticationManager,
	) {
		this._isMobile = mimiriPlatform.isPhoneSize
	}

	public async ensureRoot() {
		if (!this._root.value) {
			const note = await this.noteService.readNote(this.authManager.userData.rootNote)
			if (note) {
				this._root.value = new MimerNote(this.owner, undefined, note)
			} else {
				this._root.value = undefined
			}
		}
	}

	public register(id: Guid, note: MimerNote) {
		this.notes[id] = note
	}

	public async ensureNote(id: Guid) {
		if (!this.notes[id]) {
			await this.noteService.readNote(id)
		}
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
		this.state.selectedNoteId = id
		this.state.selectedNoteParentId = this.selectedNote?.parent?.id
		if (!this._isMobile) {
			browserHistory.open(id)
		}
		this.emitSelected(id)
	}

	public openNote(id?: Guid, mobileOpen = true) {
		const note = id ? this.getNoteById(id) : this.selectedNote
		if (note) {
			void note.select()
			this.state.viewMode = ViewMode.Content
			if (this._isMobile && mobileOpen) {
				this.state.noteOpen = true
				persistedState.noteOpen = true
				browserHistory.open(this.state.selectedNoteId)
			}
		}
	}

	public openProperties(id?: Guid) {
		const note = id ? this.getNoteById(id) : this.selectedNote
		if (note) {
			void note.select()
			this.state.viewMode = ViewMode.Properties
			if (this._isMobile) {
				this.state.noteOpen = true
				persistedState.noteOpen = true
				browserHistory.open(this.state.selectedNoteId)
			}
		}
	}

	public async loadState() {
		const selectedList = persistedState.readSelectedNote()
		const expanded = persistedState.expanded
		await this._root.value.ensureChildren()

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
					await note?.select()
				}
			}
		}
		this.state.stateLoaded = true
	}

	public async ensureChildrenRecursive(noteId: Guid): Promise<void> {
		const note = this.getNoteById(noteId)
		if (note) {
			await note.ensureChildren()
			for (const child of note.children) {
				await this.ensureChildrenRecursive(child.id)
			}
		}
	}

	public registerActionListener(listener: ActionListener) {
		this._actionListeners.push(listener)
	}

	private emitSelected(id: Guid) {
		for (const listener of this._actionListeners) {
			listener.select(id)
		}
	}

	public get selectedNoteRef() {
		return computed(() => this.getNoteById(this.state.selectedNoteId))
	}

	public get selectedNote() {
		return this.getNoteById(this.state.selectedNoteId)
	}

	public get selectedViewModelRef() {
		return computed(() => this.getViewModelById(this.state.selectedNoteId))
	}

	public get selectedViewModel() {
		return this.getViewModelById(this.state.selectedNoteId)
	}

	public logout() {
		this.notes = {}
		this._root.value = undefined
	}

	public get rootRef() {
		return this._root
	}

	public get root() {
		return this._root.value
	}

	public get controlPanelId(): Guid {
		return this.root?.note.getItem('metadata').controlPanel
	}

	public get controlPanel() {
		return this.root?.children.find(child => child.id === this.root.note.getItem('metadata').controlPanel)
	}

	public get recycleBin() {
		return this.root?.children.find(child => child.id === this.root.note.getItem('metadata').recycleBin)
	}

	public get gettingStarted() {
		return this.root?.children.find(child => child.isGettingStarted)
	}
}
