import type { Node } from 'prosemirror-model'
import type { EditorView } from 'prosemirror-view'
import { TextSelection } from 'prosemirror-state'
import type AutoComplete from '../../../components/elements/AutoComplete.vue'
import { getLanguageSuggestions } from '../language-suggestions'
import { deserialize } from './mimiri-deserializer'

export interface ClipboardManager {
	write(text: string): void
}

export class CodeBlockActionHandler {
	constructor(
		private clipboardManager: ClipboardManager,
		private autoComplete: InstanceType<typeof AutoComplete>,
		private domElement: HTMLElement,
	) {}

	/**
	 * Handle code block actions
	 * @returns true if the action was handled, false otherwise
	 */
	handle(action: string, view: EditorView, node: Node, nodePos: number): boolean {
		switch (action) {
			case 'copy-block':
				return this.handleCopyBlock(node)
			case 'select-block':
				return this.handleSelectBlock(view, node, nodePos)
			case 'copy-next-line':
				return this.handleCopyNextLine(view, node, nodePos)
			case 'unwrap-block':
				return this.handleUnwrapBlock(view, node, nodePos)
			case 'choose-language':
				return this.handleChooseLanguage(view, node, nodePos)
			default:
				return false
		}
	}

	private handleCopyBlock(node: Node): boolean {
		const text = node.textContent
		this.clipboardManager.write(text.replace(/p`([^`]+)`/g, '$1'))
		return true
	}

	private handleUnwrapBlock(view: EditorView, node: Node, nodePos: number): boolean {
		const textContent = node.textContent
		const parsedDoc = deserialize(textContent)
		const tr = view.state.tr.replaceWith(nodePos, nodePos + node.nodeSize, parsedDoc.content)
		view.dispatch(tr)
		return true
	}

	private handleSelectBlock(view: EditorView, node: Node, nodePos: number): boolean {
		const from = nodePos + 1
		const to = nodePos + node.nodeSize - 1
		const tr = view.state.tr.setSelection(TextSelection.create(view.state.doc, from, to))
		view.dispatch(tr)
		return true
	}

	private handleCopyNextLine(view: EditorView, node: Node, nodePos: number): boolean {
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
		this.clipboardManager.write(nextLine.replace(/p`([^`]+)`/g, '$1'))

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
	}

	private handleChooseLanguage(view: EditorView, node: Node, nodePos: number): boolean {
		const rect = this.domElement.querySelector('[data-action="choose-language"]:hover')?.getBoundingClientRect()
		if (!rect) {
			return false
		}

		const containerRect = this.domElement.getBoundingClientRect()

		// Calculate position relative to container
		const relativeLeft = rect.left - containerRect.left
		const relativeBottom = rect.bottom - containerRect.top
		const relativeTop = rect.top - containerRect.top

		// Estimate autocomplete height (rough estimate based on typical item count)
		const estimatedHeight = 250 // Approximate max height for autocomplete
		const spaceBelow = containerRect.height - relativeBottom
		const showAbove = spaceBelow < estimatedHeight && relativeTop > estimatedHeight

		this.autoComplete.show(
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
					language: item === '(none)' ? '' : item,
				})
				view.dispatch(tr)
				this.autoComplete.hide()
			},
			() => {
				this.autoComplete.hide()
			},
			showAbove,
		)

		return true
	}
}
