import type { Node } from 'prosemirror-model'
import type { EditorView } from 'prosemirror-view'
import { deserialize } from './mimiri-deserializer'
import { serialize } from './mimiri-serializer'
import type ConflictBanner from '../../../components/elements/ConflictBanner.vue'

export class ConflictActionHandler {
	private _conflictPositions: number[] = []
	private _currentConflictIndex = 0
	private _editorView: EditorView | null = null

	constructor(private _conflictBanner: InstanceType<typeof ConflictBanner> | null) {}

	/**
	 * Set the editor view reference (called after editor is created)
	 */
	setEditorView(view: EditorView): void {
		this._editorView = view
	}

	/**
	 * Handle conflict block actions
	 * @returns true if the action was handled, false otherwise
	 */
	handle(action: string, view: EditorView, node: Node, nodePos: number): boolean {
		const content = this.getResolvedContent(action, node)
		if (content === null) {
			return false
		}

		this.applyResolution(view, node, nodePos, content)
		this.schedulePostResolutionCleanup(view)

		return true
	}

	private getResolvedContent(action: string, node: Node): string | null {
		switch (action) {
			case 'keep-local':
				return node.attrs.localContent

			case 'keep-server':
				return node.attrs.serverContent

			case 'keep-both':
				return this.mergeContent(node.attrs.localContent, node.attrs.serverContent)

			default:
				return null
		}
	}

	private mergeContent(localContent: string, serverContent: string): string {
		// Special case: if both local and server contain exactly one code block delimiter,
		// remove one to avoid duplicates (language may differ, e.g. ```js vs ```javascript)
		const codeBlockDelimiterRegex = /^```[\w]*\s*$/gm

		const localMatches = Array.from(localContent.matchAll(codeBlockDelimiterRegex))
		const serverMatches = Array.from(serverContent.matchAll(codeBlockDelimiterRegex))

		// Simple case: both have exactly one delimiter
		if (localMatches.length === 1 && serverMatches.length === 1) {
			// Remove the delimiter from server content
			return localContent + '\n' + serverContent.replace(codeBlockDelimiterRegex, '')
		}

		return localContent + '\n' + serverContent
	}

	private applyResolution(view: EditorView, node: Node, nodePos: number, content: string): void {
		const codeBlockLang = node.attrs.codeBlockLanguage

		if (codeBlockLang) {
			this.applyCodeBlockResolution(view, node, nodePos, content, codeBlockLang)
		} else {
			// Not in a code block, just replace with text
			const tr = view.state.tr.replaceWith(nodePos, nodePos + node.nodeSize, view.state.schema.text(content))
			view.dispatch(tr)
		}
	}

	private applyCodeBlockResolution(
		view: EditorView,
		node: Node,
		nodePos: number,
		content: string,
		codeBlockLang: string,
	): void {
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

		const hasCodeBefore = nodeBefore?.type.name === 'code_block' && nodeBefore.attrs.language === codeBlockLang
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
	}

	private schedulePostResolutionCleanup(view: EditorView): void {
		// Check if there are any remaining conflicts after this resolution
		// If not, re-parse the document in normal mode to restore full formatting
		setTimeout(() => {
			let currentText = serialize(view.state.doc)

			if (!currentText.includes('<<<<<<< Local')) {
				// No more conflicts - fix any code block delimiter issues
				currentText = this.fixCodeBlockDelimiters(currentText)

				// Re-parse with full formatting
				const newDoc = deserialize(currentText)

				// Replace entire document content via transaction so dispatchTransaction is called
				const tr = view.state.tr.replaceWith(0, view.state.doc.content.size, newDoc.content)
				view.dispatch(tr)
				console.log('✅ All conflicts resolved - full formatting restored')
			}

			// Update banner (either hide it or update count)
			this.updateBanner(false)
		}, 0)
	}

	private fixCodeBlockDelimiters(text: string): string {
		// We're post-conflict, so we started from a valid state
		// Any delimiter with language is definitively a block start
		const lines = text.split('\n')
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
			return lines.join('\n')
		}

		return text
	}

	/**
	 * Update the conflict banner with current conflict count and position
	 */
	public updateBanner(historyActive: boolean): void {
		if (!this._conflictBanner || !this._editorView) {
			return
		}
		if (historyActive) {
			this._conflictBanner.hide()
			return
		}

		// Find all conflict block positions
		this._conflictPositions = []
		this._editorView.state.doc.descendants((node, pos) => {
			if (node.type.name === 'conflict_block') {
				this._conflictPositions.push(pos)
			}
		})

		const conflictCount = this._conflictPositions.length
		const wasHidden = !this._conflictBanner.isVisible

		// Ensure current index is valid
		if (this._currentConflictIndex >= conflictCount) {
			this._currentConflictIndex = 0
		}

		// Update the Vue component
		if (conflictCount === 0) {
			this._conflictBanner.hide()
		} else {
			this._conflictBanner.update(conflictCount, this._currentConflictIndex)
			this._conflictBanner.show()
		}

		// Auto-scroll to first conflict if banner just appeared
		if (wasHidden && conflictCount > 0) {
			setTimeout(() => this.scrollToCurrentConflict(), 100)
		}
	}

	/**
	 * Navigate to the next or previous conflict
	 */
	public navigateConflict(direction: 'prev' | 'next'): void {
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
		this.updateBanner(false)
	}

	private scrollToCurrentConflict(): void {
		if (this._conflictPositions.length === 0 || !this._editorView) {
			return
		}

		const pos = this._conflictPositions[this._currentConflictIndex]
		const coords = this._editorView.coordsAtPos(pos)

		// Scroll with some offset from top
		const editorRect = this._editorView.dom.getBoundingClientRect()
		const scrollOffset = coords.top - editorRect.top - 100 // 100px from top

		this._editorView.dom.scrollBy({
			top: scrollOffset,
			behavior: 'smooth',
		})
	}
}
