import { settingsManager } from '../settings-manager'
import type { MimiriEditorState, SelectionExpansion, TextEditor, TextEditorListener } from './type'

import { EditorState } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { dropCursor } from 'prosemirror-dropcursor'
import { gapCursor } from 'prosemirror-gapcursor'
import { keymap } from 'prosemirror-keymap'
import { history, redo, undo, undoDepth, redoDepth } from 'prosemirror-history'
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
import { markExitPlugin } from './prosemirror/mark-exit-plugint'
import { initHighlighter, syntaxHighlightPlugin } from './prosemirror/syntax-highlighting'
import { getThemeById } from './theme-manager'
import { clipboardManager } from '../../global'
import AutoComplete from '../../components/elements/AutoComplete.vue'
import { CheckboxListItemView } from './prosemirror/checkbox-list-item-view'
import { Plugin } from 'prosemirror-state'
import { Node as ProseMirrorNode } from 'prosemirror-model'
import { CodeBlockActionHandler } from './prosemirror/code-block-action-handler'
import { ConflictActionHandler } from './prosemirror/conflict-action-handler'
import type ConflictBanner from '../../components/elements/ConflictBanner.vue'
import { executeFormatAction } from './prosemirror/format-commands'

export class EditorProseMirror implements TextEditor {
	private _domElement: HTMLElement | undefined
	private _autoComplete: InstanceType<typeof AutoComplete> | undefined
	private lastScrollTop: number
	private historyShowing: boolean = false
	private lastSelection: { startNode: Node; start: number; endNode: Node; end: number } | undefined | undefined
	private skipScrollOnce = false
	private _active = true
	private _readonly = false
	private _activePasswordEntry: { node: Node; start: number; end: number } | undefined
	private _hasOpenDocument: boolean = false
	private _state: Omit<MimiriEditorState, 'mode'> = {
		canUndo: true,
		canRedo: true,
		canMarkAsPassword: false,
		canUnMarkAsPassword: false,
		changed: false,
	}
	private _editor: EditorView | undefined
	private _documentState: EditorState | undefined
	private _historyState: EditorState | undefined
	private _codeBlockActionHandler: CodeBlockActionHandler | undefined
	private _conflictActionHandler: ConflictActionHandler | undefined
	private _initialDoc: ProseMirrorNode | undefined

	constructor(private listener: TextEditorListener) {}

	public async init(
		domElement: HTMLElement,
		autoComplete: InstanceType<typeof AutoComplete>,
		conflictBanner: InstanceType<typeof ConflictBanner> | null,
	) {
		this._domElement = domElement
		this._autoComplete = autoComplete
		this._domElement.style.display = this._active ? 'flex' : 'none'

		// Initialize action handlers
		this._codeBlockActionHandler = new CodeBlockActionHandler(clipboardManager, this._autoComplete, this._domElement)
		this._conflictActionHandler = new ConflictActionHandler(conflictBanner)

		await initHighlighter()

		const doc = deserialize('')

		const conflictReadOnlyPlugin = new Plugin({
			props: {
				editable: state => {
					// Check if document contains any conflict blocks
					let hasConflictBlocks = false
					if (state.doc.attrs.history || this._readonly) {
						return false
					}
					state.doc.descendants(node => {
						if (node.type.name === 'conflict_block') {
							hasConflictBlocks = true
							return false // Stop iteration
						}
					})
					// Document is editable only if no conflicts exist
					return !hasConflictBlocks
				},
			},
		})

		const state = EditorState.create({
			schema: mimiriSchema,
			plugins: [
				conflictReadOnlyPlugin,
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
				markExitPlugin,
				syntaxHighlightPlugin(() => {
					return getThemeById(settingsManager.state.editorTheme, settingsManager.darkMode).shikiTheme
				}),
			],
			doc,
		})

		const view = new EditorView(this._domElement, {
			state,
			nodeViews: {
				list_item: (node, view, getPos) => {
					if (node.attrs.checked !== null) {
						return new CheckboxListItemView(node, view, getPos as () => number)
					}
					return undefined
				},
			},
			dispatchTransaction: transaction => {
				const newState = view.state.apply(transaction)
				view.updateState(newState)
				if (!newState.doc.attrs.history) {
					this._documentState = newState
				}
				this.updateState()
			},

			handleDOMEvents: {
				mousedown: (view, event) => {
					if (event.button !== 0) {
						return false
					}
					const target = event.target as HTMLElement
					const action = target.getAttribute('data-action')

					this._autoComplete.hide()
					if (
						action === 'copy-block' ||
						action === 'select-block' ||
						action === 'copy-next-line' ||
						action === 'unwrap-block' ||
						action === 'choose-language' ||
						action === 'keep-local' ||
						action === 'keep-server' ||
						action === 'keep-both'
					) {
						event.preventDefault()
						// Focus the editor if it's not already focused
						if (!view.hasFocus()) {
							view.focus()
						}
						return true
					}
					return false
				},
				mouseup: (view, event) => {
					if (event.button !== 0 || this.historyShowing) {
						return false
					}
					const element = event.target as HTMLElement
					const action = element.getAttribute('data-action')

					if (!action) {
						return false
					}

					// Get the position and node from the mouse coordinates
					const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })
					if (!pos) {
						return false
					}

					// Resolve the target node
					const target = this.resolveActionTarget(view, pos.pos)
					if (!target) {
						return false
					}

					const { node, nodePos, nodeType } = target

					// Delegate to appropriate handler
					if (nodeType === 'conflict_block') {
						const result = this._conflictActionHandler.handle(action, view, node, nodePos)
						this.updateState()
						return result
					}

					if (nodeType === 'code_block') {
						const result = this._codeBlockActionHandler.handle(action, view, node, nodePos)
						this.updateState()
						return result
					}
					return false
				},
			},

			// handleClickOn(view, pos, node, nodePos, event, direct) {
			// 	return false
			// },
		})
		this._editor = view
		this._conflictActionHandler?.setEditorView(view)
	}

	private resolveActionTarget(
		view: EditorView,
		posValue: number,
	): { node: ProseMirrorNode; nodePos: number; nodeType: string } | null {
		const $pos = view.state.doc.resolve(posValue)
		let node: ProseMirrorNode | null = null
		let nodePos = -1
		let nodeType: string | null = null

		// Walk up the tree to find the code_block or conflict_block node
		for (let d = $pos.depth; d > 0; d--) {
			const n = $pos.node(d)

			if (n.type.name === 'code_block' || n.type.name === 'conflict_block') {
				node = n
				nodePos = $pos.before(d)
				nodeType = n.type.name
				break
			}
		}

		// For atom nodes (like conflict_block), check the node before or at the current position
		if (!node) {
			// Check if we're right after an atom node
			if (posValue > 0) {
				const nodeBefore = view.state.doc.nodeAt(posValue - 1)
				if (nodeBefore?.type.name === 'conflict_block') {
					node = nodeBefore
					nodePos = posValue - 1
					nodeType = 'conflict_block'
				}
			}
			// Check if there's an atom node at the current position
			if (!node) {
				const nodeAt = view.state.doc.nodeAt(posValue)
				if (nodeAt?.type.name === 'conflict_block') {
					node = nodeAt
					nodePos = posValue
					nodeType = 'conflict_block'
				}
			}
		}

		if (!node) {
			return null
		}

		return { node, nodePos, nodeType }
	}

	private updateState() {
		this._state.changed = !!this._initialDoc && !this._editor?.state.doc.eq(this._initialDoc) && !this.historyShowing
		this._state.canUndo = this._editor ? undoDepth(this._editor.state) > 0 : false
		this._state.canRedo = this._editor ? redoDepth(this._editor.state) > 0 : false
		this.listener.onStateUpdated(this._state)
	}

	public unMarkSelectionAsPassword() {}

	public markSelectionAsPassword() {}

	public executeFormatAction(action: string) {
		if (!this._editor) {
			return
		}
		executeFormatAction(this._editor.state, this._editor.dispatch.bind(this._editor), action)
	}

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

	public navigateConflict(direction: 'prev' | 'next') {
		this._conflictActionHandler?.navigateConflict(direction)
	}

	public show(text: string, _scrollTop: number) {
		console.log('show')
		this._hasOpenDocument = true
		const newDoc = deserialize(text)

		this._documentState = EditorState.create({
			schema: mimiriSchema,
			doc: newDoc,
			plugins: this._editor.state.plugins,
		})

		this._editor.updateState(this._documentState)

		this._initialDoc = this._editor.state.doc

		// Update conflict banner
		setTimeout(() => {
			this._conflictActionHandler?.updateBanner(this.historyShowing)
			this.updateState()
		}, 0)

		// this.lastScrollTop = scrollTop
		// this._element.scrollTop = scrollTop
		// if (this._active) {
		// 	this.listener.onStateUpdated(this._state)
		// }
	}

	public updateText(text: string) {
		this._hasOpenDocument = true
		const newDoc = deserialize(text)

		this._documentState = EditorState.create({
			schema: mimiriSchema,
			doc: newDoc,
			plugins: this._editor.state.plugins,
		})

		this._editor.updateState(this._documentState)

		this._initialDoc = this._editor.state.doc

		setTimeout(() => {
			this._conflictActionHandler?.updateBanner(this.historyShowing)
			this.updateState()
		}, 0)

		// this._state.changed = false
		// if (this._element.innerText !== text) {
		// 	this._element.innerText = text
		// 	this._initialText = this._element.innerText
		// }
		// if (this._active) {
		// 	this.listener.onStateUpdated(this._state)
		// }
	}
	public switchTo(text: string) {
		if (this.text !== text) {
			const newDoc = deserialize(text)
			const tr = this._editor.state.tr
			tr.replaceWith(0, this._editor.state.doc.content.size, newDoc.content)
			this._editor.dispatch(tr)

			setTimeout(() => {
				this._conflictActionHandler?.updateBanner(this.historyShowing)
				this.updateState()
			}, 0)
		}
	}

	public resetChanged() {
		this._initialDoc = this._editor.state.doc
		this._state.changed = false
		if (this._active) {
			this.listener.onStateUpdated(this._state)
		}
	}

	public clear() {
		this._hasOpenDocument = false
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
		const newDoc = deserialize(text, true)

		this._historyState = EditorState.create({
			schema: mimiriSchema,
			doc: newDoc,
			plugins: this._editor.state.plugins,
		})
		this._editor.updateState(this._historyState)

		setTimeout(() => {
			this._conflictActionHandler?.updateBanner(this.historyShowing)
			this.updateState()
		}, 0)
	}

	public hideHistory() {
		if (this.historyShowing) {
			this.historyShowing = false
			this._domElement.classList.remove('history-active')
			console.log('restore document state')

			this._editor.updateState(this._documentState)

			if (this._editor) {
				const tr = this._editor.state.tr
				tr.setMeta('forceUpdate', true)
				this._editor.dispatch(tr)
			}

			setTimeout(() => {
				this._conflictActionHandler?.updateBanner(this.historyShowing)
				this.updateState()
			}, 0)
		}
	}

	public showHistory() {
		if (!this.historyShowing) {
			this.historyShowing = true
			this._domElement.classList.add('history-active')
		}
	}

	public undo() {
		if (this._editor) {
			undo(this._editor.state, this._editor.dispatch)
		}
	}

	public redo() {
		if (this._editor) {
			redo(this._editor.state, this._editor.dispatch)
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
		// Force a recalculation of syntax highlighting decorations when theme changes
		if (this._editor) {
			const tr = this._editor.state.tr
			tr.setMeta('forceUpdate', true)
			this._editor.dispatch(tr)
		}
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
		this._editor?.focus()
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
		return this._readonly
	}

	public set readonly(value: boolean) {
		if (this._readonly !== value) {
			this._readonly = value
			if (this._editor) {
				const tr = this._editor.state.tr
				tr.setMeta('forceUpdate', true)
				this._editor.dispatch(tr)
			}
		}
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

	public get changed(): boolean {
		return this._state.changed
	}

	public get supportsWordWrap(): boolean {
		return false
	}

	get hasOpenDocument(): boolean {
		return this._hasOpenDocument
	}
}
