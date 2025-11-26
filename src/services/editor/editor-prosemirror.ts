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
import { Plugin } from 'prosemirror-state'

// Plugin to make editor read-only during conflict resolution
const conflictReadOnlyPlugin = new Plugin({
	props: {
		editable(state) {
			// Check if document contains any conflict blocks
			let hasConflictBlocks = false
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

export class EditorProseMirror implements TextEditor {
	private _domElement: HTMLElement | undefined
	private _conflictBanner: HTMLDivElement | undefined
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
	private _currentConflictIndex = 0
	private _conflictPositions: number[] = []

	constructor(private listener: TextEditorListener) {}

	public async init(domElement: HTMLElement, autoComplete: InstanceType<typeof AutoComplete>) {
		this._domElement = domElement
		this._autoComplete = autoComplete
		this._domElement.style.display = this._active ? 'flex' : 'none'

		// Create conflict banner
		this._conflictBanner = document.createElement('div')
		this._conflictBanner.className = 'conflict-resolution-banner'
		this._conflictBanner.style.display = 'none'
		this._domElement.insertBefore(this._conflictBanner, this._domElement.firstChild)

		await initHighlighter()

		const doc = deserialize('')

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
					let nodeType = null

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
						if (pos.pos > 0) {
							const nodeBefore = view.state.doc.nodeAt(pos.pos - 1)
							if (nodeBefore?.type.name === 'conflict_block') {
								node = nodeBefore
								nodePos = pos.pos - 1
								nodeType = 'conflict_block'
							}
						}
						// Check if there's an atom node at the current position
						if (!node) {
							const nodeAt = view.state.doc.nodeAt(pos.pos)
							if (nodeAt?.type.name === 'conflict_block') {
								node = nodeAt
								nodePos = pos.pos
								nodeType = 'conflict_block'
							}
						}
					}

					if (!node) {
						return false
					}

					// Handle conflict block actions
					if (nodeType === 'conflict_block') {
						let content = ''
						if (action === 'keep-local') {
							content = node.attrs.localContent
						} else if (action === 'keep-server') {
							content = node.attrs.serverContent
						} else if (action === 'keep-both') {
							const localContent = node.attrs.localContent
							const serverContent = node.attrs.serverContent

							// Special case: if both local and server contain exactly one code block delimiter,
							// remove one to avoid duplicates (language may differ, e.g. ```js vs ```javascript)
							const codeBlockDelimiterRegex = /^```[\w]*\s*$/gm

							const localMatches = Array.from(localContent.matchAll(codeBlockDelimiterRegex))
							const serverMatches = Array.from(serverContent.matchAll(codeBlockDelimiterRegex))

							// Simple case: both have exactly one delimiter
							if (localMatches.length === 1 && serverMatches.length === 1) {
								// Remove the delimiter from server content
								content = localContent + '\n' + serverContent.replace(codeBlockDelimiterRegex, '')
							} else {
								content = localContent + '\n' + serverContent
							}
						} else {
							return false
						}

						// Check if this conflict was inside a code block
						const codeBlockLang = node.attrs.codeBlockLanguage

						if (codeBlockLang) {
							// This conflict was inside a code block, reconstitute it
							// Find the actual sibling blocks before and after
							const $pos = view.state.doc.resolve(nodePos)
							const depth = $pos.depth
							const index = $pos.index(depth)
							const parent = $pos.node(depth)

							const nodeBefore = index > 0 ? parent.child(index - 1) : null
							const nodeAfter = index < parent.childCount - 1 ? parent.child(index + 1) : null
							const nodeBeforePos = index > 0 ? nodePos - nodeBefore.nodeSize : -1
							const nodeAfterPos = index < parent.childCount - 1 ? nodePos + node.nodeSize : -1

							const hasCodeBefore =
								nodeBefore?.type.name === 'code_block' && nodeBefore.attrs.language === codeBlockLang
							const hasCodeAfter = nodeAfter?.type.name === 'code_block' && nodeAfter.attrs.language === codeBlockLang

							// Merge all parts back into a single code block
							if (hasCodeBefore && hasCodeAfter) {
								const beforeText = nodeBefore.textContent
								const afterText = nodeAfter.textContent
								const mergedText = beforeText + '\n' + content + '\n' + afterText

								const newCodeBlock = view.state.schema.nodes.code_block.create(
									{ language: codeBlockLang },
									view.state.schema.text(mergedText),
								)

								const tr = view.state.tr.replaceWith(nodeBeforePos, nodeAfterPos + nodeAfter.nodeSize, newCodeBlock)
								view.dispatch(tr)
							} else if (hasCodeBefore) {
								// Only merge with before
								const beforeText = nodeBefore.textContent
								const mergedText = beforeText + '\n' + content

								const newCodeBlock = view.state.schema.nodes.code_block.create(
									{ language: codeBlockLang },
									view.state.schema.text(mergedText),
								)

								const tr = view.state.tr.replaceWith(nodeBeforePos, nodePos + node.nodeSize, newCodeBlock)
								view.dispatch(tr)
							} else if (hasCodeAfter) {
								// Only merge with after
								const afterText = nodeAfter.textContent
								const mergedText = content + '\n' + afterText

								const newCodeBlock = view.state.schema.nodes.code_block.create(
									{ language: codeBlockLang },
									view.state.schema.text(mergedText),
								)

								const tr = view.state.tr.replaceWith(nodePos, nodeAfterPos + nodeAfter.nodeSize, newCodeBlock)
								view.dispatch(tr)
							} else {
								// No surrounding code blocks found, create new one
								const newCodeBlock = view.state.schema.nodes.code_block.create(
									{ language: codeBlockLang },
									view.state.schema.text(content),
								)

								const tr = view.state.tr.replaceWith(nodePos, nodePos + node.nodeSize, newCodeBlock)
								view.dispatch(tr)
							}
						} else {
							// Not in a code block, just replace with text
							const tr = view.state.tr.replaceWith(nodePos, nodePos + node.nodeSize, view.state.schema.text(content))
							view.dispatch(tr)
						}

						// Check if there are any remaining conflicts after this resolution
						// If not, re-parse the document in normal mode to restore full formatting
						setTimeout(() => {
							let currentText = serialize(view.state.doc)

							if (!currentText.includes('<<<<<<< Local')) {
								// No more conflicts - fix any code block delimiter issues
								// We're post-conflict, so we started from a valid state
								// Any delimiter with language is definitively a block start
								const lines = currentText.split('\n')
								const delimiterPattern = /^```([\w]*)?\s*$/
								let inCodeBlock = false
								let lastDelimiterIndex = -1
								let lastDelimiterHadLanguage = false
								const modifications: Array<{ index: number; action: 'remove' | 'insert-before' }> = []

								for (let i = 0; i < lines.length; i++) {
									const match = lines[i].match(delimiterPattern)
									if (match) {
										const hasLanguage = match[1] && match[1].length > 0

										if (!inCodeBlock) {
											// Start of a code block
											inCodeBlock = true
											lastDelimiterIndex = i
											lastDelimiterHadLanguage = hasLanguage
										} else {
											// Already in a code block, expecting closing delimiter
											if (hasLanguage) {
												// Found a start delimiter when expecting close - something went wrong
												if (lastDelimiterHadLanguage) {
													// Previous was also a start - insert closing before this one
													modifications.push({ index: i, action: 'insert-before' })
													console.warn('⚠️ Inserting closing delimiter before unexpected opening')
												} else {
													// Previous was plain delimiter that should have closed - remove it
													modifications.push({ index: lastDelimiterIndex, action: 'remove' })
													console.warn('⚠️ Removing orphaned delimiter')
												}
												// Current delimiter becomes the new opening
												lastDelimiterIndex = i
												lastDelimiterHadLanguage = true
												// Stay in code block mode
											} else {
												// Proper closing delimiter
												inCodeBlock = false
												lastDelimiterIndex = i
												lastDelimiterHadLanguage = false
											}
										}
									}
								}

								// If still in code block at end, add closing delimiter
								if (inCodeBlock) {
									modifications.push({ index: lines.length, action: 'insert-before' })
									console.warn('⚠️ Adding closing delimiter at end')
								}

								// Apply modifications in reverse order to preserve indices
								for (let i = modifications.length - 1; i >= 0; i--) {
									const mod = modifications[i]
									if (mod.action === 'remove') {
										lines.splice(mod.index, 1)
									} else if (mod.action === 'insert-before') {
										lines.splice(mod.index, 0, '```')
									}
								}

								if (modifications.length > 0) {
									currentText = lines.join('\n')
								}

								// Re-parse with full formatting
								const newDoc = deserialize(currentText)
								const newState = EditorState.create({
									schema: mimiriSchema,
									doc: newDoc,
									plugins: view.state.plugins,
								})
								view.updateState(newState)
								console.log('✅ All conflicts resolved - full formatting restored')

								// Update banner to hide it
								this.updateConflictBanner()
							} else {
								// Still have conflicts - update banner with new count
								this.updateConflictBanner()
							}
						}, 0)

						return true
					}

					if (nodeType !== 'code_block') {
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

	private updateConflictBanner() {
		if (!this._conflictBanner || !this._editor) {
			return
		}

		// Find all conflict block positions
		this._conflictPositions = []
		this._editor.state.doc.descendants((node, pos) => {
			if (node.type.name === 'conflict_block') {
				this._conflictPositions.push(pos)
			}
		})

		const conflictCount = this._conflictPositions.length
		const wasHidden = this._conflictBanner.style.display === 'none'

		if (conflictCount === 0) {
			this._conflictBanner.style.display = 'none'
			this._currentConflictIndex = 0
			return
		}

		// Show banner with conflict info
		this._conflictBanner.style.display = 'flex'

		// Ensure current index is valid
		if (this._currentConflictIndex >= conflictCount) {
			this._currentConflictIndex = 0
		}

		this._conflictBanner.innerHTML = `
			<div class="conflict-banner-content">
				<span class="conflict-banner-icon">⚠️</span>
				<span class="conflict-banner-text">
					${conflictCount} conflict${conflictCount > 1 ? 's' : ''} found - document is read-only until resolved
				</span>
				<div class="conflict-banner-actions">
					<button class="conflict-nav-btn conflict-prev-btn" ${conflictCount <= 1 ? 'disabled' : ''}>
						← Previous
					</button>
					<span class="conflict-counter">${this._currentConflictIndex + 1} / ${conflictCount}</span>
					<button class="conflict-nav-btn conflict-next-btn" ${conflictCount <= 1 ? 'disabled' : ''}>
						Next →
					</button>
				</div>
			</div>
		`

		// Add event listeners
		const prevBtn = this._conflictBanner.querySelector('.conflict-prev-btn') as HTMLButtonElement
		const nextBtn = this._conflictBanner.querySelector('.conflict-next-btn') as HTMLButtonElement

		if (prevBtn) {
			prevBtn.onclick = () => this.navigateToConflict('prev')
		}
		if (nextBtn) {
			nextBtn.onclick = () => this.navigateToConflict('next')
		}

		// Auto-scroll to first conflict if banner just appeared
		if (wasHidden && conflictCount > 0) {
			setTimeout(() => this.scrollToCurrentConflict(), 100)
		}
	}

	private scrollToCurrentConflict() {
		if (this._conflictPositions.length === 0 || !this._editor) {
			return
		}

		const pos = this._conflictPositions[this._currentConflictIndex]
		const coords = this._editor.coordsAtPos(pos)

		// Scroll with some offset from top
		const editorRect = this._editor.dom.getBoundingClientRect()
		const scrollOffset = coords.top - editorRect.top - 100 // 100px from top

		this._editor.dom.scrollBy({
			top: scrollOffset,
			behavior: 'smooth',
		})
	}

	private navigateToConflict(direction: 'prev' | 'next') {
		if (this._conflictPositions.length === 0) {
			return
		}

		if (direction === 'next') {
			this._currentConflictIndex = (this._currentConflictIndex + 1) % this._conflictPositions.length
		} else {
			this._currentConflictIndex =
				(this._currentConflictIndex - 1 + this._conflictPositions.length) % this._conflictPositions.length
		}

		// Scroll to the conflict and update banner
		this.scrollToCurrentConflict()
		this.updateConflictBanner()
	}

	public show(text: string, _scrollTop: number) {
		const newDoc = deserialize(text)

		const newState = EditorState.create({
			schema: mimiriSchema,
			doc: newDoc,
			plugins: this._editor.state.plugins,
		})

		this._editor.updateState(newState)

		// Update conflict banner
		setTimeout(() => {
			this.updateConflictBanner()
			this.updateUndoRedoState()
		}, 0)

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

		setTimeout(() => {
			this.updateConflictBanner()
			this.updateUndoRedoState()
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
