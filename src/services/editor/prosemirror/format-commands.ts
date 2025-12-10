import type { EditorState, Transaction } from 'prosemirror-state'
import type { ResolvedPos, Node as ProseMirrorNode } from 'prosemirror-model'
import { TextSelection } from 'prosemirror-state'
import { setBlockType } from 'prosemirror-commands'
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
 * Insert a code block from the current selection
 */
function executeInsertCodeBlock(
	state: EditorState,
	dispatch: (tr: Transaction) => void,
	$from: ResolvedPos,
	$to: ResolvedPos,
) {
	// Get the range of selected blocks
	const startPos = $from.before($from.depth)
	const endPos = $to.after($to.depth)

	// Collect nodes from the selection and serialize them to preserve markdown formatting
	const nodes: any[] = []
	state.doc.nodesBetween(startPos, endPos, (node, pos) => {
		// Only collect top-level block nodes within the range
		if (node.isBlock && pos >= startPos && pos < endPos) {
			const parent = state.doc.resolve(pos).parent
			if (parent.type.name === 'doc') {
				nodes.push(node)
				return false // Don't descend into children
			}
		}
		return true
	})

	// Create a temporary doc with just the selected nodes to serialize
	let textContent = ''
	if (nodes.length > 0) {
		const tempDoc = mimiriSchema.nodes.doc.create({}, nodes)
		textContent = serialize(tempDoc)
	}

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
