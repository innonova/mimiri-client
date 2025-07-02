import type { MimerNote } from '../types/mimer-note'
import { mimiriPlatform } from '../mimiri-platform'
import { persistedState } from '../persisted-state'
import { createNewNode, createNewRootNode, limitDialog } from '../../global'
import type { SharedState } from './type'

export class UIStateManager {
	private busyStart: number
	private outstandingActions: number = 0

	constructor(private state: SharedState) {
		this.state.isMobile = mimiriPlatform.isPhoneSize
		this.state.noteOpen = !this.state.isMobile
		setTimeout(() => this.checkBusyLength(), 100)
	}

	private checkBusyLength() {
		if (this.state.busy && !this.state.busyLong) {
			if (Date.now() - this.busyStart > this.state.busyLongDelay) {
				this.state.busyLong = true
				this.state.spinner = true
			}
		}
		setTimeout(() => this.checkBusyLength(), 100)
	}

	public beginAction(longBusyDelay = 1000) {
		this.outstandingActions++
		if (this.outstandingActions > 0) {
			if (!this.state.busy) {
				this.state.busy = true
				this.state.spinner = false
				this.state.busyLong = false
				this.state.busyLongDelay = longBusyDelay
				this.busyStart = Date.now()
			}
		}
	}

	public endAction() {
		if (--this.outstandingActions <= 0) {
			this.state.busy = false
			this.state.busyLong = false
		}
	}

	public closeNote() {
		if (this.state.isMobile) {
			this.state.noteOpen = false
			persistedState.noteOpen = false
		}
	}

	public closeEditorIfMobile() {
		if (this.state.isMobile && this.state.noteOpen) {
			this.state.noteOpen = false
			persistedState.noteOpen = false
		}
	}

	public newNote() {
		if (this.state.userStats.noteCount >= this.state.userStats.maxNoteCount && this.state.userStats.maxNoteCount > 0) {
			limitDialog.value.show('create-note-count')
			return
		}
		if (this.state.userStats.size >= this.state.userStats.maxTotalBytes && this.state.userStats.maxTotalBytes > 0) {
			limitDialog.value.show('create-note-size')
			return
		}
		createNewNode.value = true
	}

	public newRootNote() {
		if (this.state.userStats.noteCount >= this.state.userStats.maxNoteCount && this.state.userStats.maxNoteCount > 0) {
			limitDialog.value.show('create-note-count')
			return
		}
		if (this.state.userStats.size >= this.state.userStats.maxTotalBytes && this.state.userStats.maxTotalBytes > 0) {
			limitDialog.value.show('create-note-size')
			return
		}
		createNewRootNode.value = true
	}

	public findNextNoteStartingWith(text: string, rootNote: MimerNote, selectedNote: MimerNote) {
		let current = selectedNote
		let note: MimerNote | undefined = undefined
		if (current) {
			note = this.recurseExpandedNotes(current, note => note !== current && note.title.toLowerCase().startsWith(text))
		}
		if (!note && rootNote.children.length > 0) {
			note = this.recurseExpandedNotes(rootNote.children[0], note => note.title.toLowerCase().startsWith(text))
		}
		if (note) {
			note.select()
		}
	}

	private recurseExpandedNotes(note: MimerNote, check: (note: MimerNote) => boolean) {
		if (check(note)) {
			return note
		}
		if (note.expanded) {
			const result = this.recurseExpandedNotes(note.children[0], check)
			if (result) {
				return result
			}
		}
		if (note.nextSibling) {
			return this.recurseExpandedNotes(note.nextSibling, check)
		}
		return undefined
	}
}
