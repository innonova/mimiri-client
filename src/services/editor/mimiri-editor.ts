import type { MimerNote } from '../types/mimer-note'
import { NoteHistory } from './note-history'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { mimiriPlatform } from '../mimiri-platform'
import { EditorAdvanced } from './editor-advanced'

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

export enum SelectionExpansion {
	LineUp,
	ExpandLeft,
	ShrinkLeft,
	ShrinkRight,
	ExpandRight,
	LineDown,
}

export class MimiriEditor {
	private _history = new NoteHistory(this)
	private _note: MimerNote
	private infoElement: HTMLDivElement
	private clipboard: any
	private _editorAdvanced: EditorAdvanced

	private saveListener: () => void
	public onSave(listener: () => void) {
		this.saveListener = listener
	}

	private searchAllListener: () => void
	public onSearchAll(listener: () => void) {
		this.searchAllListener = listener
	}

	private blurListener: () => void
	public onBlur(listener: () => void) {
		this.blurListener = listener
	}

	constructor() {
		if (Capacitor.isPluginAvailable('MimiriClipboard')) {
			this.clipboard = registerPlugin<any>('MimiriClipboard')
		}
		this._editorAdvanced = new EditorAdvanced({
			onSaveRequested: () => {
				if (!this.history.isShowing) {
					this.saveListener?.()
				}
			},
			onSearchAllRequested: () => {
				this.searchAllListener?.()
			},
			onBlur: () => {
				this.blurListener?.()
			},
			onScroll: (position: number) => {
				if (this.note) {
					this.note.scrollTop = position
				}
			},
			onPasswordClicked: (top: number, left: number, text: string) => {
				this.animateNotification(top, left, text)
			},
		})
	}

	private animateNotification(top: number, left: number, text: string) {
		if (this.clipboard) {
			this.clipboard.write({ text })
		} else {
			navigator.clipboard.writeText(text)
			if (!mimiriPlatform.isAndroid) {
				this.infoElement.style.top = `${top - this.infoElement.offsetHeight}px`
				this.infoElement.style.left = `${left}px`
				this.infoElement.classList.add('animate-ping')
				setTimeout(() => {
					this.infoElement.style.left = '-2000px'
					this.infoElement.classList.remove('animate-ping')
				}, 900)
			}
		}
	}

	public init(domElement: HTMLElement) {
		this.infoElement = document.getElementById('mimiri-editor-info') as HTMLDivElement
		if (!this.infoElement) {
			this.infoElement = document.createElement('div')
			this.infoElement.id = 'mimiri-editor-info'
			this.infoElement.style.position = 'absolute'
			this.infoElement.style.left = '-2000px'
			this.infoElement.style.top = '0'
			this.infoElement.className = 'bg-warning p-1 rounded-sm shadow-sm'
			this.infoElement.innerHTML = 'copied'
			document.body.appendChild(this.infoElement)
		}
		this._editorAdvanced.init(domElement)
	}

	public open(note: MimerNote) {
		if (this.note && this.note.id !== note?.id) {
			this.note.scrollTop = this._editorAdvanced.scrollTop
		}
		if (!note) {
			this._note = undefined
			this.history.reset()
			this._editorAdvanced.clear()
			return
		}
		if (note.id !== this.note?.id) {
			this._note = note
			this.history.reset()
			this._editorAdvanced.show(note.text, this.note.scrollTop)
		} else {
			this._editorAdvanced.updateText(note.text)
		}
		this._editorAdvanced.readonly = note.isCache || note.isSystem
	}

	public reloadNode() {
		if (this.note) {
			this._editorAdvanced.updateText(this.note.text)
		}
	}

	public resetChanged() {
		this._editorAdvanced.resetChanged()
	}

	public setHistoryText(text: string) {
		this._editorAdvanced.setHistoryText(text)
	}

	public hideHistory() {
		this._editorAdvanced.hideHistory()
		this._editorAdvanced.readonly = (this.note?.isCache || this.note?.isSystem) ?? true
	}

	public showHistory() {
		this._editorAdvanced.readonly = true
		this._editorAdvanced.showHistory()
	}

	public undo() {
		this._editorAdvanced.undo()
	}

	public redo() {
		this._editorAdvanced.redo()
	}

	public clearSearchHighlights() {
		this._editorAdvanced.clearSearchHighlights()
	}

	public setSearchHighlights(text: string) {
		this._editorAdvanced.setSearchHighlights(text)
	}

	public find() {
		this._editorAdvanced.find()
	}

	public syncSettings() {
		this._editorAdvanced.syncSettings()
	}

	public expandSelection(type: SelectionExpansion) {
		this._editorAdvanced.expandSelection(type)
	}

	public selectAll() {
		this._editorAdvanced.selectAll()
	}

	public cut() {
		const text = this._editorAdvanced.cut()
		if (text) {
			navigator.clipboard.writeText(text)
		}
		this._editorAdvanced.focus()
	}

	public copy() {
		const text = this._editorAdvanced.copy()
		if (text) {
			navigator.clipboard.writeText(text)
		}
		this._editorAdvanced.focus()
	}

	public async paste() {
		const text = await navigator.clipboard.readText()
		this._editorAdvanced.paste(text)
		this._editorAdvanced.focus()
		this._editorAdvanced.focus()
	}

	public toggleSelectionAsPassword() {
		if (this.canUnMarkAsPassword) {
			this._editorAdvanced.unMarkSelectionAsPassword()
		} else if (this.canMarkAsPassword) {
			this._editorAdvanced.markSelectionAsPassword()
		}
	}

	public focus() {
		this._editorAdvanced.focus()
	}

	public get canUndo() {
		return this._editorAdvanced.canUndo
	}

	public get canRedo() {
		return this._editorAdvanced.canRedo
	}

	public get note() {
		return this._note
	}

	public get history() {
		return this._history
	}

	public get canMarkAsPassword() {
		return this._editorAdvanced.canMarkAsPassword
	}

	public get canUnMarkAsPassword() {
		return this._editorAdvanced.canUnMarkAsPassword
	}

	public get changed() {
		return this._editorAdvanced.changed
	}

	public get text() {
		return this._editorAdvanced.text
	}
}
