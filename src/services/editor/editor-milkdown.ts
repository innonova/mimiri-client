import { Debounce } from '../helpers'
import { settingsManager } from '../settings-manager'
import type { EditorState, SelectionExpansion, TextEditor, TextEditorListener } from './type'
import { Editor, rootCtx, defaultValueCtx, editorViewCtx } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { listener, listenerCtx } from '@milkdown/plugin-listener'
import { replaceAll, callCommand } from '@milkdown/utils'
import { gfm } from '@milkdown/preset-gfm'
import { history, redoCommand, undoCommand } from '@milkdown/plugin-history'
import { closeHistory } from 'prosemirror-history'
import { EditorState as ProseMirrorEditorState } from 'prosemirror-state'
import {
	createPasswordPlugin,
	passwordInputRule,
	passwordConversionPluginExport,
} from './plugins/milkdown-password-plugin'

export class EditorMilkdown implements TextEditor {
	private _domElement: HTMLElement | undefined
	private _history: HTMLDivElement | undefined
	private _initialText: string = ''
	private lastScrollTop: number
	private historyShowing: boolean = false
	private lastSelection: { startNode: Node; start: number; endNode: Node; end: number } | undefined | undefined
	private skipScrollOnce = false
	private _active = true
	private _wordWrap = true
	private _activePasswordEntry: { node: Node; start: number; end: number } | undefined
	private _state: Omit<EditorState, 'mode'> = {
		canUndo: true,
		canRedo: true,
		changed: false,
		canMarkAsPassword: false,
		canUnMarkAsPassword: false,
	}
	private _editor: Editor | undefined

	constructor(private listener: TextEditorListener) {}

	public async init(domElement: HTMLElement) {
		this._domElement = domElement
		this._domElement.style.display = this._active ? 'flex' : 'none'

		console.log('this._domElement.id', this._domElement.id)

		this._editor = await Editor.make()
			.config(ctx => {
				ctx.set(rootCtx, `#${this._domElement.id}`)
				ctx.set(defaultValueCtx, '# Your markdown here')

				// Listen to changes
				ctx.get(listenerCtx).markdownUpdated((ctx, markdown) => {
					// console.log('Markdown changed:', markdown)
					this.updateUndoRedoState()
				})
				ctx.get(listenerCtx).mounted(ctx => {
					const editorElement = document.querySelector(`#${this._domElement.id}`)

					editorElement.addEventListener('click', e => {
						const taskItem = e.target as HTMLElement
						if (taskItem) {
							// Toggle the task - you'll need to update the markdown
							const isChecked = taskItem.getAttribute('data-checked') === 'true'
							console.log(isChecked)

							// Update via Milkdown API
						}
					})

					// Initial undo/redo state
					this.updateUndoRedoState()
				})
			})
			.use(commonmark)
			.use(gfm)
			.use(history) // Enable undo/redo functionality
			.use(passwordConversionPluginExport) // Convert p`...` code back to plain text
			.use(passwordInputRule)
			.use(createPasswordPlugin(this.listener)) // Pass listener for double-click handling
			.use(listener)
			.create()
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
		this._state.changed = false
		// console.log(text)

		// The conversion plugin will handle p`...` patterns automatically
		this._editor.action(replaceAll(text))

		// Clear history by creating a new EditorState with fresh history
		this._editor.action(ctx => {
			const view = ctx.get(editorViewCtx) as any
			if (view?.state) {
				// Create a new state with the same document and plugins but fresh history
				const newState = ProseMirrorEditorState.create({
					doc: view.state.doc,
					plugins: view.state.plugins,
				})
				view.updateState(newState)
			}
		})

		this._initialText = text

		// Update undo/redo state
		setTimeout(() => this.updateUndoRedoState(), 0)

		// this.lastScrollTop = scrollTop
		// this._element.scrollTop = scrollTop
		// if (this._active) {
		// 	this.listener.onStateUpdated(this._state)
		// }
	}

	public updateText(text: string) {
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

	private updateUndoRedoState() {
		if (this._editor) {
			this._editor.action(ctx => {
				const view = ctx.get(editorViewCtx) as any
				if (view?.state?.history$) {
					const undoDepth = view.state.history$.done.eventCount ?? 0
					const redoDepth = view.state.history$.undone.eventCount ?? 0

					this._state.canUndo = undoDepth > 0
					this._state.canRedo = redoDepth > 0

					if (this._active) {
						this.listener.onStateUpdated(this._state)
					}
				}
			})
		}
	}
	public undo() {
		if (this._editor) {
			this._editor.action(callCommand(undoCommand.key))
			// Update state after undo
			setTimeout(() => this.updateUndoRedoState(), 0)
		}
	}

	public redo() {
		if (this._editor) {
			this._editor.action(callCommand(redoCommand.key))
			// Update state after redo
			setTimeout(() => this.updateUndoRedoState(), 0)
		}
	}

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
			this._editor?.action(ctx => {
				ctx.get<any, string>('editorView').focus()
			})
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

	get initialText(): string {
		return this._initialText
	}

	public get text(): string {
		return this._initialText
	}

	public get changed(): boolean {
		return this._state.changed
	}
}
