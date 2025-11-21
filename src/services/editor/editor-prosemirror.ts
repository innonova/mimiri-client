import { settingsManager } from '../settings-manager'
import type { MimiriEditorState, SelectionExpansion, TextEditor, TextEditorListener } from './type'

import { EditorState, TextSelection } from 'prosemirror-state'
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
import { markExitPlugin } from './prosemirror/mark-exit-plugint'
import { initHighlighter, syntaxHighlightPlugin } from './prosemirror/syntax-highlighting'
import { getThemeById } from './theme-manager'
import { clipboardManager } from '../../global'
import AutoComplete from '../../components/elements/AutoComplete.vue'
import { getLanguageSuggestions } from './language-suggestions'
import { CheckboxListItemView } from './prosemirror/checkbox-list-item-view'

export class EditorProseMirror implements TextEditor {
	private _domElement: HTMLElement | undefined
	private _autoComplete: InstanceType<typeof AutoComplete> | undefined
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

	public async init(domElement: HTMLElement, autoComplete: InstanceType<typeof AutoComplete>) {
		this._domElement = domElement
		this._autoComplete = autoComplete
		this._domElement.style.display = this._active ? 'flex' : 'none'

		await initHighlighter()

		const doc = deserialize('')

		const state = EditorState.create({
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
			dispatchTransaction(transaction) {
				const newState = view.state.apply(transaction)
				view.updateState(newState)

				// console.log(serialize(view.state.doc))
			},

			handleDOMEvents: {
				mousedown: (view, event) => {
					const target = event.target as HTMLElement
					const action = target.getAttribute('data-action')
					this._autoComplete.hide()
					if (
						action === 'copy-block' ||
						action === 'select-block' ||
						action === 'copy-next-line' ||
						action === 'choose-language'
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

					const $pos = view.state.doc.resolve(pos.pos)
					let node = null
					let nodePos = -1

					// Walk up the tree to find the code_block node
					for (let d = $pos.depth; d > 0; d--) {
						const n = $pos.node(d)
						if (n.type.name === 'code_block') {
							node = n
							nodePos = $pos.before(d)
							break
						}
					}

					if (!node || node.type.name !== 'code_block') {
						return false
					}

					if (action === 'copy-block') {
						const text = node.textContent
						clipboardManager.write(text.replace(/p`([^`]+)`/g, '$1'))
						return true
					} else if (action === 'select-block') {
						// Select all the content of the code block
						const from = nodePos + 1
						const to = nodePos + node.nodeSize - 1
						const tr = view.state.tr.setSelection(TextSelection.create(view.state.doc, from, to))
						view.dispatch(tr)
						return true
					} else if (action === 'copy-next-line') {
						// Get current selection within the code block
						const { from, to } = view.state.selection
						const text = node.textContent
						const lines = text.split('\n')
						const blockStart = nodePos + 1

						// Find which line is currently selected (if any)
						let currentLineIndex = -1
						let charCount = blockStart

						if (to > from) {
							for (let i = 0; i < lines.length; i++) {
								const lineStart = charCount
								const lineEnd = charCount + lines[i].length
								// Check if selection is within this line
								if (from >= lineStart && from <= lineEnd && to >= lineStart && to <= lineEnd) {
									currentLineIndex = i
									break
								}
								charCount = lineEnd + 1 // +1 for newline
							}
						}

						// Select next line, or first line if none selected or we're at the last line
						let nextLineIndex
						if (currentLineIndex === -1 || currentLineIndex === lines.length - 1) {
							nextLineIndex = 0
						} else {
							nextLineIndex = currentLineIndex + 1
						}

						// Find the next line with actual content (skip blank lines)
						let attempts = 0
						while (lines[nextLineIndex].trim() === '' && attempts < lines.length) {
							nextLineIndex = (nextLineIndex + 1) % lines.length
							attempts++
						}

						// If all lines are blank, just use the calculated nextLineIndex
						const nextLine = lines[nextLineIndex]

						// Copy the line to clipboard
						clipboardManager.write(nextLine.replace(/p`([^`]+)`/g, '$1'))

						// Calculate position of the next line
						let lineStart = blockStart
						for (let i = 0; i < nextLineIndex; i++) {
							lineStart += lines[i].length + 1
						}
						const lineEnd = lineStart + nextLine.length

						// Select the line
						const tr = view.state.tr.setSelection(TextSelection.create(view.state.doc, lineStart, lineEnd))
						view.dispatch(tr)
						return true
					} else if (action === 'choose-language') {
						const rect = (event.target as HTMLElement).getBoundingClientRect()
						const containerRect = this._domElement.getBoundingClientRect()

						// Calculate position relative to container
						const relativeLeft = rect.left - containerRect.left
						const relativeBottom = rect.bottom - containerRect.top
						const relativeTop = rect.top - containerRect.top

						// Estimate autocomplete height (rough estimate based on typical item count)
						const estimatedHeight = 250 // Approximate max height for autocomplete
						const spaceBelow = containerRect.height - relativeBottom
						const showAbove = spaceBelow < estimatedHeight && relativeTop > estimatedHeight

						this._autoComplete.show(
							relativeLeft,
							showAbove ? relativeTop : relativeBottom,
							node.attrs.language ?? '',
							(query: string) => {
								return getLanguageSuggestions(query).map(suggestion => suggestion.label)
							},
							(item: string) => {
								// Update the code block's language attribute
								const tr = view.state.tr.setNodeMarkup(nodePos, null, {
									...node.attrs,
									language: item,
								})
								view.dispatch(tr)
								this._autoComplete.hide()
							},
							() => {
								this._autoComplete.hide()
							},
							showAbove,
						)
					}

					return false
				},
			},

			// handleClickOn(view, pos, node, nodePos, event, direct) {
			// 	return false
			// },
		})
		this._editor = view
	}

	public unMarkSelectionAsPassword() {}

	public markSelectionAsPassword() {}

	public executeFormatAction(_action: string) {}

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

	public show(text: string, _scrollTop: number) {
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

	public setHistoryText(_text: string) {
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
