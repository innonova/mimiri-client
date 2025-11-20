import type { Node } from 'prosemirror-model'

const serializeNode = (node: Node, depth: number, indentStyle: string): string => {
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
			text += node.text
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
		if (node.type.name === 'list_item') {
			text += `${indentStyle.repeat(depth)}${node.attrs.marker ?? '-'} ${node.attrs.checked !== null ? (node.attrs.checked ? '[x] ' : '[ ] ') : ''}`
		}
		if (node.type.name === 'code_block') {
			text += `\`\`\`${node.attrs.language ?? ''}\n`
		}
		if (node.type.name === 'heading') {
			text += `#`.repeat(node.attrs.level) + ' '
		}
		node.forEach(child => {
			text += serializeNode(
				child,
				node.type.name === 'list_item' ? depth + 1 : depth,
				node.type.name === 'bullet_list' || node.type.name === 'ordered_list'
					? (node.attrs.indent ?? indentStyle)
					: indentStyle,
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
	console.log(doc)
	let text = ''
	if (doc.type.name !== 'doc') {
		throw new Error('Expected a document node')
	}
	// console.log(doc.type.name)
	// console.log('serialize')
	for (const child of doc.content.content) {
		text += serializeNode(child, 0, doc.attrs.indent ?? '  ')
	}
	return text
}
