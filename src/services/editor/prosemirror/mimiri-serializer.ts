import type { Node } from 'prosemirror-model'
import { cleanUrl, urlPatternBase } from './url-utils'

const bareUrlRegex = new RegExp('^' + urlPatternBase.source + '$')

// True when the deserializer's bare-URL detection would turn this exact
// string back into a link on its own.
const isBareUrl = (url: string): boolean => {
	const match = bareUrlRegex.exec(url)
	return !!match && cleanUrl(match[1]) === url
}

// A link mark is written back as markdown `[text](href)`. Bare URLs are
// auto-linked by the deserializer with text === href; those stay bare so a
// plain URL is not rewritten just by switching editor mode — but only when
// the deserializer would recognize the bare form again, otherwise the link
// would be lost on the next round-trip.
const serializeLinkText = (node: Node): string => {
	const link = node.marks.find(mark => mark.type.name === 'link')
	if (!link) {
		return node.text
	}
	if (link.attrs.href === node.text && isBareUrl(node.text)) {
		return node.text
	}
	return `[${node.text}](${link.attrs.href})`
}

const serializeNode = (
	node: Node,
	depth: number,
	indentStyle: string,
	hideListMarker: boolean,
	orderedIndex?: number,
): string => {
	let text = ''
	if (node.isText) {
		if (node.marks.length > 0) {
			for (const mark of node.marks) {
				if (mark.type.name === 'strong') {
					text += '**'
				} else if (mark.type.name === 'em') {
					text += '*'
				} else if (mark.type.name === 'code') {
					text += '`'
				} else if (mark.type.name === 'password') {
					text += 'p`'
				}
			}
			text += serializeLinkText(node)
			for (const mark of node.marks.slice().reverse()) {
				if (mark.type.name === 'strong') {
					text += '**'
				} else if (mark.type.name === 'em') {
					text += '*'
				} else if (mark.type.name === 'code') {
					text += '`'
				} else if (mark.type.name === 'password') {
					text += '`'
				}
			}
		} else {
			text += node.text
		}
	} else {
		if (node.type.name === 'conflict_block') {
			text += `<<<<<<< Local\n`
			text += node.attrs.localContent
			text += `\n=======\n`
			text += node.attrs.serverContent
			text += `\n>>>>>>> Server\n`
			return text
		}
		if (node.type.name === 'list_item') {
			// Items created in the editor (as opposed to deserialized from text)
			// have no marker attr; under an ordered list the marker must be
			// numeric or the text form loses its ordered-ness.
			const marker =
				orderedIndex !== undefined && !/^\d+[.)]$/.test(node.attrs.marker ?? '')
					? `${orderedIndex + 1}.`
					: (node.attrs.marker ?? '-')
			text += `${indentStyle.repeat(depth)}${hideListMarker ? '' : `${marker} `}${node.attrs.checked !== null ? (node.attrs.checked ? '[x] ' : '[ ] ') : ''}`
		}
		if (node.type.name === 'code_block') {
			text += `\`\`\`${node.attrs.language ?? ''}\n`
		}
		if (node.type.name === 'heading') {
			text += `#`.repeat(node.attrs.level) + ' '
		}
		node.forEach((child, _offset, index) => {
			text += serializeNode(
				child,
				node.type.name === 'list_item' ? depth + 1 : depth,
				node.type.name === 'bullet_list' || node.type.name === 'ordered_list'
					? (node.attrs.indent ?? indentStyle)
					: indentStyle,
				node.attrs.hideListMarker ?? false,
				node.type.name === 'ordered_list' ? index : undefined,
			)
		})
		if (node.type.name === 'paragraph' || node.type.name === 'heading' || node.type.name === 'blockquote') {
			text += '\n'
		} else if (node.type.name === 'hard_break') {
			text += '\n'
		} else if (node.type.name === 'bullet_list' || node.type.name === 'ordered_list') {
			// text += '\n'
		} else if (node.type.name === 'code_block') {
			text += '\n```\n'
		}
	}
	return text
}

export const serialize = (doc: Node) => {
	// console.log(doc)
	let text = ''
	if (doc.type.name !== 'doc') {
		throw new Error('Expected a document node')
	}
	// console.log(doc.type.name)
	// console.log('serialize')
	for (const child of doc.content.content) {
		text += serializeNode(child, 0, doc.attrs.indent ?? '  ', false)
	}
	return text.substring(0, text.length - 1) // Remove the last newline added
}
