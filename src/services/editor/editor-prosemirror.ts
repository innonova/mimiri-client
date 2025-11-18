import { settingsManager } from '../settings-manager'
import type { MimiriEditorState, SelectionExpansion, TextEditor, TextEditorListener } from './type'

import { EditorState } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { dropCursor } from 'prosemirror-dropcursor'
import { gapCursor } from 'prosemirror-gapcursor'
import { keymap } from 'prosemirror-keymap'
import { history, redo, undo } from 'prosemirror-history'
import {
	baseKeymap,
	chainCommands,
	createParagraphNear,
	liftEmptyBlock,
	newlineInCode,
	splitBlock,
} from 'prosemirror-commands'
import { mimiriSchema } from './prosemirror/mimiri-schema'
import { mimiriInputRules } from './prosemirror/mimiri-input-rules'
import { liftListItem, sinkListItem, splitListItem } from 'prosemirror-schema-list'
import { deserialize } from './prosemirror/mimiri-deserializer'
import { serialize } from './prosemirror/mimiri-serializer'

export class EditorProseMirror implements TextEditor {
	private _domElement: HTMLElement | undefined
	private _history: HTMLDivElement | undefined
	private lastScrollTop: number
	private historyShowing: boolean = false
	private lastSelection: { startNode: Node; start: number; endNode: Node; end: number } | undefined | undefined
	private skipScrollOnce = false
	private _active = true
	private _wordWrap = true
	private _activePasswordEntry: { node: Node; start: number; end: number } | undefined
	private _state: Omit<MimiriEditorState, 'mode' | 'changed'> = {
		canUndo: true,
		canRedo: true,
		canMarkAsPassword: false,
		canUnMarkAsPassword: false,
	}
	private _editor: EditorView | undefined

	constructor(private listener: TextEditorListener) {}

	public async init(domElement: HTMLElement) {
		this._domElement = domElement
		this._domElement.style.display = this._active ? 'flex' : 'none'

		const doc = deserialize('')

		let state = EditorState.create({
			schema: mimiriSchema,
			plugins: [
				mimiriInputRules(mimiriSchema),
				keymap({
					'Mod-z': undo,
					'Mod-y': redo,
					Enter: splitListItem(mimiriSchema.nodes.list_item),
					Tab: sinkListItem(mimiriSchema.nodes.list_item),
					'Shift-Tab': liftListItem(mimiriSchema.nodes.list_item),
					'Shift-Enter': chainCommands(newlineInCode, createParagraphNear, liftEmptyBlock, splitBlock),
				}),
				keymap(baseKeymap),
				dropCursor(),
				gapCursor(),
				history(),
			],
			doc,
		})

		const view = new EditorView(this._domElement, {
			state,
			dispatchTransaction(transaction) {
				let newState = view.state.apply(transaction)
				view.updateState(newState)

				// console.log(serialize(view.state.doc))
			},
		})
		this._editor = view
	}

	public unMarkSelectionAsPassword() {}

	public markSelectionAsPassword() {}

	public executeFormatAction(action: string) {}

	public get active(): boolean {
		return this._active
	}

	public set active(value: boolean) {
		if (this._active !== value) {
			this._active = value
			if (this._domElement) {
				this._domElement.style.display = this._active ? 'flex' : 'none'
			}
			if (this._active) {
				this.listener.onStateUpdated(this._state)
			}
		}
	}

	public show(text: string, scrollTop: number) {
		const newDoc = deserialize(text)

		const newState = EditorState.create({
			schema: mimiriSchema,
			doc: newDoc,
			plugins: this._editor.state.plugins,
		})

		this._editor.updateState(newState)

		setTimeout(() => this.updateUndoRedoState(), 0)

		// this.lastScrollTop = scrollTop
		// this._element.scrollTop = scrollTop
		// if (this._active) {
		// 	this.listener.onStateUpdated(this._state)
		// }
	}

	public updateText(text: string) {
		const newDoc = deserialize(text)

		const newState = EditorState.create({
			schema: mimiriSchema,
			doc: newDoc,
			plugins: this._editor.state.plugins,
		})

		this._editor.updateState(newState)

		setTimeout(() => this.updateUndoRedoState(), 0)

		// this._state.changed = false
		// if (this._element.innerText !== text) {
		// 	this._element.innerText = text
		// 	this._initialText = this._element.innerText
		// }
		// if (this._active) {
		// 	this.listener.onStateUpdated(this._state)
		// }
	}

	public resetChanged() {
		// this._initialText = this._element.innerText
		// this._state.changed = false
		// if (this._active) {
		// 	this.listener.onStateUpdated(this._state)
		// }
	}

	public clear() {
		// Clear formatting detector
		// this._initialText = ''
		// this._state.changed = false
		// this._state.canUndo = false
		// this._state.canRedo = false
		// this._element.innerText = ''
		// this.readonly = true
		// if (this._active) {
		// 	this.listener.onStateUpdated(this._state)
		// }
	}

	public setHistoryText(text: string) {
		// this._history.innerText = text
	}

	public hideHistory() {
		// if (this.historyShowing) {
		// 	const scrollTop = this.lastScrollTop
		// 	this._history.contentEditable = 'plaintext-only'
		// 	this._history.focus()
		// 	this._history.blur()
		// 	this._history.contentEditable = 'false'
		// 	this._history.style.display = 'none'
		// 	this._element.style.display = 'flex'
		// 	this._state.canUndo = true
		// 	this._state.canRedo = true
		// 	this.listener.onStateUpdated(this._state)
		// 	this.historyShowing = false
		// 	this.focus()
		// 	setTimeout(() => {
		// 		this._element.scrollTop = scrollTop
		// 	})
		// }
	}

	public showHistory() {
		// if (!this.historyShowing) {
		// 	this._history.contentEditable = 'plaintext-only'
		// 	this._element.style.display = 'none'
		// 	this._history.style.display = 'flex'
		// 	this._history.focus()
		// 	this._history.blur()
		// 	this._history.contentEditable = 'false'
		// 	this._state.canUndo = false
		// 	this._state.canRedo = false
		// 	this.listener.onStateUpdated(this._state)
		// 	this.historyShowing = true
		// }
	}

	private updateUndoRedoState() {}

	public undo() {}

	public redo() {}

	public clearSearchHighlights() {}
	public setSearchHighlights(_text: string) {}
	public find() {}

	public toggleWordWrap() {
		settingsManager.wordwrap = !settingsManager.wordwrap
		this.syncSettings()
	}

	public syncSettings() {
		// if (this._wordWrap !== settingsManager.wordwrap) {
		// 	if (this.historyShowing) {
		// 		if (settingsManager.wordwrap) {
		// 			this._history.contentEditable = 'plaintext-only'
		// 			this._history.focus()
		// 			this._wordWrap = true
		// 			this._history.style.whiteSpace = 'pre-wrap'
		// 			this._element.style.whiteSpace = 'pre-wrap'
		// 			this._element.style.overflowX = 'hidden'
		// 			this._history.style.overflowX = 'hidden'
		// 			this._history.blur()
		// 			this._history.contentEditable = 'false'
		// 		} else {
		// 			this._history.contentEditable = 'plaintext-only'
		// 			this._history.focus()
		// 			this._wordWrap = false
		// 			this._history.style.whiteSpace = 'pre'
		// 			this._element.style.whiteSpace = 'pre'
		// 			this._element.style.overflowX = 'auto'
		// 			this._history.style.overflowX = 'auto'
		// 			this._history.blur()
		// 			this._history.contentEditable = 'false'
		// 		}
		// 	} else {
		// 		if (settingsManager.wordwrap) {
		// 			this._wordWrap = true
		// 			this._element.style.whiteSpace = 'pre-wrap'
		// 			this._history.style.whiteSpace = 'pre-wrap'
		// 			this._element.style.overflowX = 'hidden'
		// 			this._history.style.overflowX = 'hidden'
		// 		} else {
		// 			this._wordWrap = false
		// 			this._element.style.whiteSpace = 'pre'
		// 			this._history.style.whiteSpace = 'pre'
		// 			this._element.style.overflowX = 'auto'
		// 			this._history.style.overflowX = 'auto'
		// 		}
		// 	}
		// }
	}

	public expandSelection(_type: SelectionExpansion) {}

	public focus() {
		if (!this.historyShowing) {
		}
	}

	public selectAll() {
		// document.getSelection().selectAllChildren(this._element)
	}

	public cut() {
		try {
			document.execCommand('cut')
		} catch {}
	}

	public copy() {
		try {
			document.execCommand('copy')
		} catch {}
	}

	public paste(_text: string) {
		try {
			document.execCommand('paste')
		} catch {}
	}
	public get readonly() {
		return false
		// return this._element.contentEditable === 'false'
	}

	public set readonly(value: boolean) {
		// this._element.contentEditable = value ? 'false' : 'plaintext-only'
	}
	public get scrollTop(): number {
		return 0
		// return this._element.scrollTop
	}

	// get initialText(): string {
	// 	return this._initialText
	// }

	public get text(): string {
		return serialize(this._editor.state.doc)
	}

	// public get changed(): boolean {
	// 	return this._state.changed
	// }
}
