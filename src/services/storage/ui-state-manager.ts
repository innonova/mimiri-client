import type { MimerNote } from '../types/mimer-note'
import { mimiriPlatform } from '../mimiri-platform'
import { persistedState } from '../persisted-state'
import { createNewNode, createNewRootNode, limitDialog } from '../../global'
import type { SharedState } from './type'

export class UIStateManager {
	private busyStart: number
	private outstandingActions: number = 0
	private _isMobile: boolean

	constructor(private sharedState: SharedState) {
		this._isMobile = mimiriPlatform.isPhoneSize
		this.sharedState.noteOpen = !this._isMobile
		setTimeout(() => this.checkBusyLength(), 100)
	}

	private checkBusyLength() {
		if (this.sharedState.busy && !this.sharedState.busyLong) {
			if (Date.now() - this.busyStart > this.sharedState.busyLongDelay) {
				this.sharedState.busyLong = true
				this.sharedState.spinner = true
			}
		}
		setTimeout(() => this.checkBusyLength(), 100)
	}

	public beginAction(longBusyDelay = 1000) {
		this.outstandingActions++
		if (this.outstandingActions > 0) {
			if (!this.sharedState.busy) {
				this.sharedState.busy = true
				this.sharedState.spinner = false
				this.sharedState.busyLong = false
				this.sharedState.busyLongDelay = longBusyDelay
				this.busyStart = Date.now()
			}
		}
	}

	public endAction() {
		if (--this.outstandingActions <= 0) {
			this.sharedState.busy = false
			this.sharedState.busyLong = false
		}
	}

	public closeNote() {
		if (this._isMobile) {
			this.sharedState.noteOpen = false
			persistedState.noteOpen = false
		}
	}

	public closeEditorIfMobile() {
		if (this._isMobile && this.sharedState.noteOpen) {
			this.sharedState.noteOpen = false
			persistedState.noteOpen = false
		}
	}

	public newNote() {
		if (
			this.sharedState.userStats.noteCount >= this.sharedState.userStats.maxNoteCount &&
			this.sharedState.userStats.maxNoteCount > 0
		) {
			limitDialog.value.show('create-note-count')
			return
		}
		if (
			this.sharedState.userStats.size >= this.sharedState.userStats.maxTotalBytes &&
			this.sharedState.userStats.maxTotalBytes > 0
		) {
			limitDialog.value.show('create-note-size')
			return
		}
		createNewNode.value = true
	}

	public newRootNote() {
		if (
			this.sharedState.userStats.noteCount >= this.sharedState.userStats.maxNoteCount &&
			this.sharedState.userStats.maxNoteCount > 0
		) {
			limitDialog.value.show('create-note-count')
			return
		}
		if (
			this.sharedState.userStats.size >= this.sharedState.userStats.maxTotalBytes &&
			this.sharedState.userStats.maxTotalBytes > 0
		) {
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

	public get isMobile() {
		return this._isMobile
	}
}
