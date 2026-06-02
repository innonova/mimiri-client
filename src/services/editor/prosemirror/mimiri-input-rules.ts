import {
	ellipsis,
	emDash,
	InputRule,
	inputRules,
	smartQuotes,
	textblockTypeInputRule,
	wrappingInputRule,
} from 'prosemirror-inputrules'
import type { MarkType, NodeType, Schema } from 'prosemirror-model'
import { findWrapping } from 'prosemirror-transform'
import { cleanUrl, urlPatternBase } from './url-utils'

const blockQuoteRule = (nodeType: NodeType) => {
	return wrappingInputRule(/^\s*>\s$/, nodeType)
}

const orderedListRule = (nodeType: NodeType) => {
	return wrappingInputRule(
		/^(\d+)\.\s$/,
		nodeType,
		match => ({ order: +match[1] }),
		(match, node) => node.childCount + node.attrs.order == +match[1],
	)
}

const bulletListRule = (nodeType: NodeType) => {
	return wrappingInputRule(/^\s*([-+*])\s$/, nodeType)
}

const checkboxListRule = (bulletListType: NodeType, listItemType: NodeType) => {
	// Matches [ ] or [x] at the start of a textblock (the preceding "- " is consumed by bulletListRule)
	return new InputRule(/^\[([ xX])\]\s$/, (state, match, start, end) => {
		const checked = match[1].toLowerCase() === 'x'
		const tr = state.tr.delete(start, end)

		// Re-resolve after deletion
		const mappedStart = tr.mapping.map(start)
		const $start = tr.doc.resolve(mappedStart)

		// If already inside a list_item (e.g. after typing "- " first), just update its attrs
		for (let d = $start.depth; d > 0; d--) {
			const node = $start.node(d)
			if (node.type === listItemType) {
				tr.setNodeMarkup($start.before(d), null, { ...node.attrs, checked, marker: '-' })
				return tr
			}
		}

		// Otherwise wrap the paragraph in bullet_list > list_item
		const range = $start.blockRange()
		if (!range) return null
		const wrapping = findWrapping(range, bulletListType, {})
		if (!wrapping) return null
		tr.wrap(range, wrapping)

		// Find the newly inserted list_item and set its attrs
		const mappedStart2 = tr.mapping.map(start)
		const $after = tr.doc.resolve(mappedStart2)
		for (let d = $after.depth; d > 0; d--) {
			const node = $after.node(d)
			if (node.type === listItemType) {
				tr.setNodeMarkup($after.before(d), null, { ...node.attrs, checked, marker: '-' })
				break
			}
		}

		return tr
	})
}

const codeBlockRule = (nodeType: NodeType) => {
	return textblockTypeInputRule(/^```$/, nodeType)
}

const headingRule = (nodeType: NodeType, maxLevel: number) => {
	return textblockTypeInputRule(new RegExp('^(#{1,' + maxLevel + '})\\s$'), nodeType, match => ({
		level: match[1].length,
	}))
}

// Check if position already has a link mark
const hasLinkMark = (state, pos: number, markType: MarkType): boolean => {
	return state.doc
		.resolve(pos)
		.marks()
		.some(mark => mark.type === markType)
}

// Input rule to convert plain URLs to links when space is pressed
const urlInputRule = (markType: MarkType) => {
	const urlRegex = new RegExp(urlPatternBase.source + '\\s$')

	return new InputRule(urlRegex, (state, match, start) => {
		const url = cleanUrl(match[1])
		if (hasLinkMark(state, start, markType)) return null

		const urlEnd = start + url.length
		return state.tr
			.addMark(start, urlEnd, markType.create({ href: url }))
			.insertText(' ', urlEnd)
			.removeStoredMark(markType)
	})
}

// Input rule for inline code with backticks
const inlineCodeRule = (markType: MarkType) => {
	// Match text surrounded by backticks: `code`
	return new InputRule(/`([^`]+)`$/, (state, match, start, end) => {
		const $start = state.doc.resolve(start)

		// Don't apply in code blocks
		if ($start.parent.type.spec.code) {
			return null
		}

		// Check if we already have a code mark here
		const hasCode = state.doc.rangeHasMark(start, end, markType)
		if (hasCode) {
			return null
		}

		const textContent = match[1]

		return state.tr
			.delete(start, start + 1) // Remove opening backtick
			.delete(start + textContent.length, start + textContent.length + 1) // Remove closing backtick (adjusted for first deletion)
			.addMark(start, start + textContent.length, markType.create())
			.removeStoredMark(markType)
	})
}

// Helper to convert URL at cursor position to link (used by Enter key handler)
export const convertUrlAtCursor = (markType: MarkType) => {
	return (state, dispatch) => {
		const { $cursor } = state.selection
		if (!$cursor) return false

		const textBefore = $cursor.parent.textBetween(0, $cursor.parentOffset, undefined, '\ufffc')
		const urlMatch = textBefore.match(new RegExp(urlPatternBase.source + '$'))
		if (!urlMatch) return false

		const url = cleanUrl(urlMatch[1])
		const start = $cursor.pos - urlMatch[1].length
		const end = start + url.length

		if (hasLinkMark(state, start, markType)) return false

		if (dispatch) {
			dispatch(state.tr.addMark(start, end, markType.create({ href: url })))
		}
		return false // Allow Enter to proceed with normal action
	}
}

export const mimiriInputRules = (schema: Schema) => {
	const rules = smartQuotes.concat(ellipsis, emDash)
	let type
	if ((type = schema.nodes.blockquote)) {
		rules.push(blockQuoteRule(type))
	}
	if ((type = schema.nodes.ordered_list)) {
		rules.push(orderedListRule(type))
	}
	if ((type = schema.nodes.bullet_list)) {
		rules.push(checkboxListRule(type, schema.nodes.list_item))
		rules.push(bulletListRule(type))
	}
	if ((type = schema.nodes.code_block)) {
		rules.push(codeBlockRule(type))
	}
	if ((type = schema.nodes.heading)) {
		rules.push(headingRule(type, 6))
	}
	let markType
	if ((markType = schema.marks.link)) {
		rules.push(urlInputRule(markType))
	}
	if ((markType = schema.marks.code)) {
		rules.push(inlineCodeRule(markType))
	}
	return inputRules({ rules })
}
