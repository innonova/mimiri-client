import type { MimerNote } from '../types/mimer-note'
import { NoteHistory } from './note-history'
import { mimiriPlatform } from '../mimiri-platform'
import { EditorAdvanced } from './editor-advanced'
import type { EditorState, SelectionExpansion, TextEditor, TextEditorListener } from './type'
import { reactive, type Ref } from 'vue'
import { EditorSimple } from './editor-simple'
import { EditorDisplay } from './editor-display'
import { settingsManager } from '../settings-manager'
import { clipboardManager, debug, noteManager, saveEmptyNodeDialog } from '../../global'
import { VersionConflictError } from '../storage/mimiri-client'
import { EditorMilkdown } from './editor-milkdown'

export class MimiriEditor {
	private _history = new NoteHistory(this)
	private _note: MimerNote
	private infoElement: HTMLDivElement
	private _editorAdvanced: EditorAdvanced
	private _editorSimple: EditorSimple
	private _editorDisplay: EditorDisplay
	private _editorMilkdown: EditorMilkdown
	private _activeEditor: TextEditor
	private _state: EditorState
	private _monacoElement: HTMLElement
	private _simpleElement: HTMLElement
	private _displayElement: HTMLElement
	private _milkdownElement: HTMLElement
	private _monacoInitialized: boolean = false
	private _simpleInitialized: boolean = false
	private _displayInitialized: boolean = false
	private _milkdownInitialized: boolean = false

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
		this._state = reactive({
			canUndo: false,
			canRedo: false,
			changed: false,
			canMarkAsPassword: false,
			canUnMarkAsPassword: false,
			mode: '',
		})

		const editorListener: TextEditorListener = {
			onSaveRequested: () => {
				if (!this.history.isShowing) {
					this.saveListener?.()
				}
			},
			onSearchAllRequested: () => {
				this.searchAllListener?.()
			},
			onEditorBlur: () => {
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
			onStateUpdated: state => {
				Object.assign(this._state, state)
			},
		}

		this._editorAdvanced = new EditorAdvanced(editorListener)
		this._editorSimple = new EditorSimple(editorListener)
		this._editorDisplay = new EditorDisplay(editorListener)
		this._editorMilkdown = new EditorMilkdown(editorListener)
	}

	private animateNotification(top: number, left: number, text: string) {
		clipboardManager.write(text)
		if (!mimiriPlatform.isAndroidApp) {
			this.infoElement.style.top = `${top - this.infoElement.offsetHeight}px`
			this.infoElement.style.left = `${left}px`
			this.infoElement.classList.add('animate-ping')
			setTimeout(() => {
				this.infoElement.style.left = '-2000px'
				this.infoElement.classList.remove('animate-ping')
			}, 900)
		}
	}

	private activateAdvanced() {
		if (!this._monacoInitialized) {
			this._monacoInitialized = true
			this._editorAdvanced.init(this._monacoElement)
		}
		this._editorAdvanced.active = true
		this._editorSimple.active = false
		this._editorDisplay.active = false
		this._activeEditor = this._editorAdvanced
		this._state.mode = 'advanced'
		this._activeEditor.syncSettings()
	}

	private activateSimple() {
		if (!this._simpleInitialized) {
			this._simpleInitialized = true
			this._editorSimple.init(this._simpleElement)
		}
		this._editorAdvanced.active = false
		this._editorSimple.active = true
		this._editorDisplay.active = false
		this._activeEditor = this._editorSimple
		this._state.mode = 'simple'
		this._activeEditor.syncSettings()
	}

	private activateDisplay() {
		if (!this._displayInitialized) {
			this._displayInitialized = true
			this._editorDisplay.init(this._displayElement)
		}
		this._editorAdvanced.active = false
		this._editorSimple.active = false
		this._editorDisplay.active = true
		this._activeEditor = this._editorDisplay
		this._state.mode = 'display'
		this._activeEditor.syncSettings()
	}

	private activateMilkdown() {
		if (!this._milkdownInitialized) {
			this._milkdownInitialized = true
			this._editorMilkdown.init(this._milkdownElement)
		}
		this._editorAdvanced.active = false
		this._editorSimple.active = false
		this._editorDisplay.active = false
		this._editorMilkdown.active = true
		this._activeEditor = this._editorMilkdown
		this._state.mode = 'milkdown'
		this._activeEditor.syncSettings()
	}

	private activateEditor() {
		this.activateMilkdown()
		// if (settingsManager.simpleEditor) {
		// 	this.activateSimple()
		// } else {
		// 	this.activateAdvanced()
		// }
	}

	public init(
		monacoElement: HTMLElement,
		simpleElement: HTMLElement,
		displayElement: HTMLElement,
		milkdownElement: HTMLElement,
	) {
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

		this._monacoElement = monacoElement
		this._simpleElement = simpleElement
		this._displayElement = displayElement
		this._milkdownElement = milkdownElement

		this.activateEditor()
	}

	public mobileClosing() {
		if (!settingsManager.alwaysEdit && this.note.text.trim().length > 0) {
			this.activateDisplay()
		}
	}

	public open(note: MimerNote) {
		if (this.note && this.note.id !== note?.id) {
			this.note.scrollTop = this._activeEditor.scrollTop
		}
		if (!note) {
			this._note = undefined
			this.history.reset()
			this._activeEditor.clear()
			return
		}
		if (note.id !== this.note?.id) {
			if (!settingsManager.alwaysEdit && note.text.trim().length > 0) {
				this.activateDisplay()
			} else {
				this.activateEditor()
			}
			this._note = note
			this.history.reset()
			this._activeEditor.show(note.text, this.note.scrollTop)
			this._activeEditor.readonly = note.isSystem
		} else {
			if (!this._activeEditor.changed) {
				this._activeEditor.updateText(note.text)
			} else {
				if (note.text === this._activeEditor.text) {
					this._activeEditor.resetChanged()
				}
			}
		}
	}

	public async save(): Promise<string> {
		let result = 'success'
		const noteId = this.note?.id
		const targetText = this._activeEditor.text
		const initialText = this._activeEditor.initialText
		if (noteId && targetText !== initialText) {
			if (targetText.length === 0 && initialText.length > 5) {
				const doSave = await saveEmptyNodeDialog.value.show(noteManager.tree.getNoteById(noteId))
				if (!doSave) {
					return 'not-saved-empty'
				}
			}
			while (true) {
				try {
					const note = noteManager.tree.getNoteById(noteId)
					if (targetText === note.text) {
						if (note.id === this.note.id) {
							this.resetChanged()
						}
						return 'success'
					}
					if (initialText !== note.text) {
						result = 'lost-update'
					}
					// const sizeBefore = note.size
					note.text = targetText
					// const sizeAfter = note.size
					// if (sizeAfter > noteManager.state.userStats.maxNoteBytes && noteManager.state.userStats.maxNoteBytes > 0) {
					// 	return 'note-size'
					// } else if (
					// 	noteManager.state.userStats.size > noteManager.state.userStats.maxTotalBytes &&
					// 	sizeAfter >= sizeBefore &&
					// 	noteManager.state.userStats.maxTotalBytes > 0
					// ) {
					// 	return 'total-size'
					// } else {
					await note.save()
					if (note.id === this.note.id) {
						this.resetChanged()
					}
					// }
					break
				} catch (ex) {
					debug.logError(`Failed to save note ${noteId}`, ex)
					if (ex instanceof VersionConflictError) {
						continue
					}
					break
				}
			}
		}
		return result
	}

	public activateEdit() {
		this.activateEditor()
		this._activeEditor.show(this.note.text, this.note.scrollTop)
		this._activeEditor.readonly = this.note.isSystem
	}

	public reloadNode() {
		if (this.note) {
			this._activeEditor.updateText(this.note.text)
			this._activeEditor.readonly = this.note.isSystem
		}
	}

	public resetChanged() {
		this._activeEditor.resetChanged()
		this._activeEditor.readonly = this.note.isSystem
	}

	public setHistoryText(text: string) {
		this._activeEditor.setHistoryText(text)
	}

	public hideHistory() {
		this._activeEditor.hideHistory()
		this._activeEditor.readonly = this.note?.isSystem ?? true
	}

	public showHistory() {
		this._activeEditor.readonly = true
		this._activeEditor.showHistory()
	}

	public undo() {
		this._activeEditor.undo()
	}

	public redo() {
		this._activeEditor.redo()
	}

	public clearSearchHighlights() {
		this._activeEditor.clearSearchHighlights()
	}

	public setSearchHighlights(text: string) {
		this._activeEditor.setSearchHighlights(text)
	}

	public find() {
		this._activeEditor.find()
	}

	public toggleWordWrap() {
		this._activeEditor.toggleWordWrap()
	}

	public syncSettings() {
		this._activeEditor.syncSettings()
	}

	public expandSelection(type: SelectionExpansion) {
		this._activeEditor.expandSelection(type)
	}

	public selectAll() {
		this._activeEditor.selectAll()
	}

	public cut() {
		const text = this._activeEditor.cut()
		if (text) {
			clipboardManager.write(text)
		}
		this._activeEditor.focus()
	}

	public copy() {
		const text = this._activeEditor.copy()
		if (text) {
			clipboardManager.write(text)
		}
		this._activeEditor.focus()
	}

	public async paste() {
		const text = await navigator.clipboard.readText()
		this._activeEditor.paste(text)
		this._activeEditor.focus()
		this._activeEditor.focus()
	}

	public toggleSelectionAsPassword() {
		if (this.canUnMarkAsPassword) {
			this._activeEditor.unMarkSelectionAsPassword()
		} else if (this.canMarkAsPassword) {
			this._activeEditor.markSelectionAsPassword()
		}
	}

	public executeFormatAction(action: string) {
		this._activeEditor.executeFormatAction(action)
	}

	public focus() {
		this._activeEditor.focus()
	}

	public get canUndo() {
		return this._state.canUndo
	}

	public get canRedo() {
		return this._state.canRedo
	}

	public get note() {
		return this._note
	}

	public get history() {
		return this._history
	}

	public get canMarkAsPassword() {
		return this._state.canMarkAsPassword
	}

	public get canUnMarkAsPassword() {
		return this._state.canUnMarkAsPassword
	}

	public get changed() {
		return this._state.changed
	}

	public get text() {
		return this._activeEditor.text
	}

	public get mode() {
		return this._state.mode
	}
}
