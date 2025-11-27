import type { EditorState, Transaction } from 'prosemirror-state'
import type { ResolvedPos } from 'prosemirror-model'
import { TextSelection } from 'prosemirror-state'
import { setBlockType } from 'prosemirror-commands'
import { mimiriSchema } from './mimiri-schema'
import { insertList } from './list-commands'

/**
 * Execute a format action on the current selection
 */
export function executeFormatAction(state: EditorState, dispatch: (tr: Transaction) => void, action: string) {
	const { selection } = state
	const { $from, $to } = selection

	switch (action) {
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

	// Collect text content from selection
	let textContent = ''
	state.doc.nodesBetween($from.pos, $to.pos, node => {
		if (node.isTextblock) {
			if (textContent) {
				textContent += '\n'
			}
			textContent += node.textContent
		}
	})

	// Create code block with collected content
	const codeBlock = mimiriSchema.nodes.code_block.create(
		{ language: null },
		textContent ? mimiriSchema.text(textContent) : null,
	)

	// Replace selection with code block
	const tr = state.tr.replaceWith(startPos, endPos, codeBlock)

	// Position cursor inside the code block for language input
	// The cursor should be at the start of the code block content
	const newPos = startPos + 1
	tr.setSelection(TextSelection.create(tr.doc, newPos))

	dispatch(tr)
}
