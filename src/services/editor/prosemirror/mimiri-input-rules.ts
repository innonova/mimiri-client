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
	return state.doc.resolve(pos).marks().some(mark => mark.type === markType)
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
	return inputRules({ rules })
}
