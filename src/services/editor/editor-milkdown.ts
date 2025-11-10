import { Debounce } from '../helpers'
import { settingsManager } from '../settings-manager'
import type { EditorState, SelectionExpansion, TextEditor, TextEditorListener } from './type'
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { listener, listenerCtx } from '@milkdown/plugin-listener'
import { replaceAll } from '@milkdown/utils'
import { gfm } from '@milkdown/preset-gfm'

export class EditorMilkdown implements TextEditor {
	private _domElement: HTMLElement | undefined
	private _element: HTMLDivElement | undefined
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
					console.log('Markdown changed:', markdown)
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
				})
			})
			.use(commonmark)
			.use(gfm)
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
		console.log(text)

		this._editor.action(replaceAll(text))

		// this._editor!.commands.setContent(text, {
		// 	contentType: 'markdown',
		// })
		this._initialText = text
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

	public undo() {
		try {
			document.execCommand('undo')
		} catch {}
	}

	public redo() {
		try {
			document.execCommand('redo')
		} catch {}
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
			this._element.focus()
		}
	}

	public selectAll() {
		document.getSelection().selectAllChildren(this._element)
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
		return this._element.contentEditable === 'false'
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
