import type { EditorState, Transaction } from 'prosemirror-state'
import type { ResolvedPos, Node as ProseMirrorNode } from 'prosemirror-model'
import { TextSelection } from 'prosemirror-state'
import { setBlockType, toggleMark } from 'prosemirror-commands'
import { mimiriSchema } from './mimiri-schema'
import { insertList } from './list-commands'
import { serialize } from './mimiri-serializer'
import { deserialize } from './mimiri-deserializer'

/**
 * Get list of supported format actions for the current selection
 */
export function getSupportedActions(from: number, to: number, doc: ProseMirrorNode): string[] {
	const actions: string[] = [
		'insert-heading',
		'insert-code-block',
		'insert-checkbox-list',
		'insert-unordered-list',
		'insert-ordered-list',
	]
	const node = doc.nodeAt(from)
	let canMarkAsPassword = false
	let canUnMarkAsPassword = from === to && !!node?.marks?.find(mark => mark.type.name === 'password')

	if (from !== to) {
		const $from = doc.resolve(from)
		const $to = doc.resolve(to)
		const isSingleLine = $from.parent === $to.parent && ['paragraph', 'code_block'].includes($from.parent.type.name)
		const isCodeBlock = $from.parent.type.name === 'code_block'

		if (isSingleLine) {
			if (isCodeBlock) {
				// In code blocks, check if selection is exactly a p`...` password pattern
				const selectedText = doc.textBetween(from, to)
				const textBefore = from > $from.start() ? doc.textBetween(from - 2, from) : ''
				const textAfter = to < $from.end() ? doc.textBetween(to, to + 1) : ''

				// Can unmark if selection is wrapped with p` and `
				if (textBefore === 'p`' && textAfter === '`') {
					canUnMarkAsPassword = true
				}

				// Can mark if no backticks in selection and not already a password
				if (!selectedText.includes('`') && textBefore !== 'p`') {
					canMarkAsPassword = true
				}
			} else {
				// Regular paragraph - check for marks
				let foundMark = false
				$from.parent.descendants((child, pos) => {
					const nodeStart = pos + $from.start()
					const nodeEnd = nodeStart + child.nodeSize
					if (nodeEnd > from && nodeStart < to) {
						if (child.marks.length > 0) {
							foundMark = true
							// Check if selection exactly matches a password-marked node
							const hasPasswordMark = child.marks.find(m => m.type.name === 'password')
							if (hasPasswordMark && nodeStart === from && nodeEnd === to) {
								canUnMarkAsPassword = true
							}
						}
					}
				})
				canMarkAsPassword = !foundMark
			}
		}
	} else {
		// Cursor position (no selection) - check for code block password pattern
		const $pos = doc.resolve(from)
		if ($pos.parent.type.name === 'code_block') {
			// In code block, check if cursor is inside a p`...` pattern
			const parentText = $pos.parent.textContent
			const offset = from - $pos.start()

			// Find if we're inside a p`...` pattern
			let inPassword = false
			let i = 0
			while (i < parentText.length) {
				if (parentText[i] === 'p' && parentText[i + 1] === '`') {
					const start = i
					let end = parentText.indexOf('`', i + 2)
					if (end !== -1) {
						end++ // Include the closing backtick
						if (offset > start && offset < end) {
							inPassword = true
							break
						}
						i = end
						continue
					}
				}
				i++
			}
			canUnMarkAsPassword = inPassword
		}
	}

	if (canMarkAsPassword) {
		actions.push('mark-password')
	}
	if (canUnMarkAsPassword) {
		actions.push('unmark-password')
	}

	return actions
}

/**
 * Mark the current selection as a password
 */
export function markSelectionAsPassword(state: EditorState, dispatch: (tr: Transaction) => void): void {
	const from = state.selection.from
	let to = state.selection.to
	const $from = state.doc.resolve(from)

	// Trim trailing whitespace from selection
	const selectedText = state.doc.textBetween(from, to)
	const trimmedText = selectedText.replace(/\s+$/, '')
	if (trimmedText.length < selectedText.length) {
		to = from + trimmedText.length
	}

	// Don't mark if nothing left after trimming
	if (from >= to) {
		return
	}

	// Handle code block differently - insert p` and ` wrapper around text
	if ($from.parent.type.name === 'code_block') {
		const tr = state.tr
		tr.insertText('`', to)
		tr.insertText('p`', from)
		tr.setSelection(TextSelection.create(tr.doc, from + 2, to + 2))
		dispatch(tr)
		return
	}

	// Regular paragraph - add password mark
	const passwordMark = mimiriSchema.marks.password
	const tr = state.tr.addMark(from, to, passwordMark.create())
	tr.setSelection(TextSelection.create(tr.doc, from, to))
	dispatch(tr)
}

/**
 * Remove password marking from the current selection or cursor position
 */
export function unmarkSelectionAsPassword(state: EditorState, dispatch: (tr: Transaction) => void): void {
	const { from, to } = state.selection
	const $pos = state.doc.resolve(from)
	const parent = $pos.parent

	// Handle code block differently - remove p` and ` wrapper from text
	if (parent.type.name === 'code_block') {
		if (from !== to) {
			// Selection mode: remove p` before and ` after selection
			const tr = state.tr
			tr.delete(to, to + 1) // Remove closing `
			tr.delete(from - 2, from) // Remove p`
			tr.setSelection(TextSelection.create(tr.doc, from - 2, to - 2))
			dispatch(tr)
			return
		} else {
			// Cursor mode: find the p`...` pattern and remove wrappers
			const parentText = parent.textContent
			const offset = from - $pos.start()

			let i = 0
			while (i < parentText.length) {
				if (parentText[i] === 'p' && parentText[i + 1] === '`') {
					const start = i
					const end = parentText.indexOf('`', i + 2)
					if (end !== -1 && offset > start && offset <= end + 1) {
						// Found the password pattern containing cursor
						const absoluteStart = $pos.start() + start
						const absoluteEnd = $pos.start() + end + 1
						const tr = state.tr
						tr.delete(absoluteEnd - 1, absoluteEnd) // Remove closing `
						tr.delete(absoluteStart, absoluteStart + 2) // Remove p`
						dispatch(tr)
						return
					}
					i = end !== -1 ? end + 1 : i + 1
					continue
				}
				i++
			}
		}
		return
	}

	// Regular paragraph - remove password mark
	const passwordMark = mimiriSchema.marks.password
	let markStart = from
	let markEnd = from

	parent.descendants((child, pos) => {
		const nodeStart = pos + $pos.start()
		const nodeEnd = nodeStart + child.nodeSize
		if (nodeEnd > from && nodeStart <= from) {
			if (child.marks.find(m => m.type === passwordMark)) {
				markStart = nodeStart
				markEnd = nodeEnd
			}
		}
	})

	// Remove the password mark from the range
	const tr = state.tr.removeMark(markStart, markEnd, passwordMark)
	dispatch(tr)
}

/**
 * Execute a format action on the current selection
 */
export function executeFormatAction(state: EditorState, dispatch: (tr: Transaction) => void, action: string) {
	const { selection } = state
	const { $from, $to } = selection

	switch (action) {
		case 'mark-password': {
			markSelectionAsPassword(state, dispatch)
			break
		}

		case 'unmark-password': {
			unmarkSelectionAsPassword(state, dispatch)
			break
		}

		case 'insert-heading': {
			executeInsertHeading(state, dispatch, $from)
			break
		}

		case 'insert-code-block': {
			executeInsertCodeBlock(state, dispatch, $from, $to)
			break
		}

		case 'insert-checkbox-list': {
			insertList(state, dispatch, 'checkbox')
			break
		}

		case 'insert-unordered-list': {
			insertList(state, dispatch, 'bullet')
			break
		}

		case 'insert-ordered-list': {
			insertList(state, dispatch, 'ordered')
			break
		}
	}
}

/**
 * Insert or cycle through heading levels
 */
function executeInsertHeading(state: EditorState, dispatch: (tr: Transaction) => void, $from: ResolvedPos) {
	const parentNode = $from.parent
	if (parentNode.type === mimiriSchema.nodes.heading) {
		// Cycle through heading levels or convert back to paragraph
		const currentLevel = parentNode.attrs.level
		if (currentLevel < 6) {
			// Increase heading level
			const tr = state.tr.setBlockType(
				$from.before($from.depth),
				$from.after($from.depth),
				mimiriSchema.nodes.heading,
				{ level: currentLevel + 1 },
			)
			dispatch(tr)
		} else if (currentLevel === 6) {
			setBlockType(mimiriSchema.nodes.paragraph)(state, dispatch)
		}
	} else {
		// Convert to heading level 1
		setBlockType(mimiriSchema.nodes.heading, { level: 1 })(state, dispatch)
	}
}

/**
 * Find the depth of the top-level block (direct child of doc) containing the position.
 * This ensures we replace entire blocks instead of nested content, which would break
 * document structure rules (e.g., replacing a paragraph inside a list item).
 */
function getTopLevelBlockDepth($pos: ResolvedPos): number {
	let depth = $pos.depth
	while (depth > 0) {
		if ($pos.node(depth - 1).type.name === 'doc') {
			return depth
		}
		depth--
	}
	return 1 // Fallback to depth 1
}

/**
 * Insert a code block from the current selection, or apply inline code mark for single-line selections
 */
function executeInsertCodeBlock(
	state: EditorState,
	dispatch: (tr: Transaction) => void,
	$from: ResolvedPos,
	$to: ResolvedPos,
) {
	const { from, to } = state.selection

	// Check if selection is within a single text block (inline selection)
	const isSameParagraph = $from.parent === $to.parent
	const isInlineable = isSameParagraph && $from.parent.type.name !== 'code_block'
	const hasSelection = from !== to

	// If user has selected text within a single text block, check if it's single-line for inline code
	if (hasSelection && isInlineable) {
		const selectedText = state.doc.textBetween(from, to)
		const isMultiLine = selectedText.includes('\n')

		// For single-line selection, toggle inline code mark
		if (!isMultiLine) {
			const codeMark = mimiriSchema.marks.code
			toggleMark(codeMark)(state, dispatch)
			return
		} else {
			// Multi-line selection within single paragraph - create code block preserving all paragraph text
			const fromDepth = getTopLevelBlockDepth($from)
			const toDepth = getTopLevelBlockDepth($to)
			const startPos = $from.before(fromDepth)
			const endPos = $to.after(toDepth)

			// Get all text from the block range to avoid losing unselected content
			const textContent = state.doc.textBetween(startPos, endPos, '\n', '\n')
			const codeBlockMarkdown = '```\n' + textContent + '\n```'
			const parsedDoc = deserialize(codeBlockMarkdown)

			const tr = state.tr.replaceWith(startPos, endPos, parsedDoc.content)
			const newPos = startPos + 1
			tr.setSelection(TextSelection.create(tr.doc, newPos))
			dispatch(tr)
			return
		}
	}

	// Otherwise, insert a code block
	// Get the range of selected blocks at the top-level block depth
	const fromDepth = getTopLevelBlockDepth($from)
	const toDepth = getTopLevelBlockDepth($to)
	const startPos = $from.before(fromDepth)
	const endPos = $to.after(toDepth)

	// Get the full text content from the affected blocks (preserves content even with collapsed cursor)
	const textContent = state.doc.textBetween(startPos, endPos, '\n', '\n')

	// Wrap the content in code fence syntax and deserialize to get proper code block
	const codeBlockMarkdown = '```\n' + textContent + '\n```'
	const parsedDoc = deserialize(codeBlockMarkdown)

	// Replace selection with the parsed code block
	const tr = state.tr.replaceWith(startPos, endPos, parsedDoc.content)

	// Position cursor inside the code block
	const newPos = startPos + 1
	tr.setSelection(TextSelection.create(tr.doc, newPos))

	dispatch(tr)
}

/**
 * Exit a code block by creating a new paragraph after it when pressing Enter on an empty line at the end.
 * Only triggers if there's no content after the code block.
 * Returns true if the command was applicable and executed.
 */
export function exitCodeBlock(state: EditorState, dispatch?: (tr: Transaction) => void): boolean {
	const { $from, $to } = state.selection

	// Only handle if cursor (not selection) is in a code block
	if ($from.parent.type.name !== 'code_block' || $from.pos !== $to.pos) {
		return false
	}

	// Check if there's any content after the code block
	const codeBlockEnd = $from.after()
	const docEnd = state.doc.content.size
	const hasContentAfter = codeBlockEnd < docEnd - 1 // -1 because doc end position is after closing tag

	// Only exit if there's no content after the code block
	if (hasContentAfter) {
		return false
	}

	// Check if we're at the end of the code block on an empty line
	const codeBlock = $from.parent
	const textContent = codeBlock.textContent
	const cursorOffset = $from.parentOffset

	// Check if the line we're on is empty (only whitespace or nothing after cursor to end)
	const textAfterCursor = textContent.slice(cursorOffset)
	const textBeforeCursor = textContent.slice(0, cursorOffset)
	const lastNewline = textBeforeCursor.lastIndexOf('\n')
	const currentLine = lastNewline >= 0 ? textBeforeCursor.slice(lastNewline + 1) : textBeforeCursor

	// Exit if current line is empty (only whitespace) and we're at the end of the block or next line is empty
	const currentLineEmpty = currentLine.trim() === ''
	const atEndOfBlock = textAfterCursor === '' || textAfterCursor === '\n'

	if (currentLineEmpty && atEndOfBlock) {
		if (dispatch) {
			// Remove the empty line from the code block if it exists
			let codeBlockEnd = $from.after()
			if (textAfterCursor === '\n') {
				// Remove the trailing newline
				const tr = state.tr.delete($from.pos, $from.pos + 1)
				codeBlockEnd = tr.doc.resolve($from.pos).after()

				// Insert a new paragraph after the code block
				const paragraph = state.schema.nodes.paragraph.create()
				tr.insert(codeBlockEnd, paragraph)

				// Move cursor to the new paragraph
				tr.setSelection(TextSelection.create(tr.doc, codeBlockEnd + 1))
				dispatch(tr)
			} else {
				// Just insert a paragraph after the code block
				const tr = state.tr
				const paragraph = state.schema.nodes.paragraph.create()
				tr.insert(codeBlockEnd, paragraph)

				// Move cursor to the new paragraph
				tr.setSelection(TextSelection.create(tr.doc, codeBlockEnd + 1))
				dispatch(tr)
			}
		}
		return true
	}

	return false
}
