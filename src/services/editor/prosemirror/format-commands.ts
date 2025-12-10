import type { EditorState, Transaction } from 'prosemirror-state'
import type { ResolvedPos } from 'prosemirror-model'
import { TextSelection } from 'prosemirror-state'
import { setBlockType } from 'prosemirror-commands'
import { mimiriSchema } from './mimiri-schema'
import { insertList } from './list-commands'
import { serialize } from './mimiri-serializer'
import { deserialize } from './mimiri-deserializer'

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
