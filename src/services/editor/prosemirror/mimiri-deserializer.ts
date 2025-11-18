import { is } from 'date-fns/locale'
import { mimiriSchema } from './mimiri-schema'
import type { Node } from 'prosemirror-model'

const headingRegex = /^(#{1,6})\s+(.*)$/
const listItemRegex = /^(\s*)([-*+]|\d+\.)\s+(?:(\[(?:\s|[xX])\])\s+)?(.*)$/
const blockquoteRegex = /^(\s*)>\s?(.*)$/
const codeBlockRegex = /^```(.*)$/
const indentedTextRegex = /^(\s+)(\S.*)$/
const orderedRegex = /^(\d+)\./
const strongRegex = /(?:\*\*([^*]+?)\*\*|__([^_]+?)__)/g
const emphasisRegex = /(?:\*([^*]+?)\*|_([^_]+?)_)/g

interface Token {
	type: string
	indent: string
	depth: number
	value?: string
	checked?: boolean
	lineEnd: boolean
	lineStart: boolean
}

interface TreeNode {
	type: string
	indent?: string
	depth: number
	value?: string
	checked?: boolean
	children: TreeNode[]
}

const indentToDepth = (indent: string) => {
	if (!indent) {
		return 0
	}
	let depth = 0
	for (let i = 0; i < indent.length; i++) {
		if (indent[i] === '\t') {
			depth += 2
		} else {
			depth += 1
		}
	}
	return depth
}

const subTokenizeText = (
	tokens: Token[],
	text: string,
	lineEnd: boolean,
	lineStart: boolean,
	indent: string = '',
): void => {
	let match
	if ((match = strongRegex.test(text))) {
		console.log(match)
	}
	tokens.push({ type: 'text', value: text, lineEnd, lineStart, indent, depth: indentToDepth(indent) })
}

const tokenize = (text: string): Token[] => {
	const lines = text.split('\n') //.slice(0, 10)
	const tokens: Token[] = []
	for (const line of lines) {
		let match
		if ((match = headingRegex.exec(line))) {
			tokens.push({
				type: 'heading',
				indent: match[1],
				depth: indentToDepth(match[1]),
				lineEnd: false,
				lineStart: true,
			})
			subTokenizeText(tokens, match[2], true, false)
		} else if ((match = listItemRegex.exec(line))) {
			if (match[3]) {
				tokens.push({
					type: 'list_item',
					indent: match[1],
					depth: indentToDepth(match[1]),
					checked: match[3].toLowerCase() === '[x]',
					value: match[2],
					lineEnd: false,
					lineStart: true,
				})
			} else {
				tokens.push({
					type: 'list_item',
					indent: match[1],
					depth: indentToDepth(match[1]),
					value: match[2],
					lineEnd: false,
					lineStart: true,
				})
			}
			subTokenizeText(tokens, match[4], true, false)
		} else if ((match = blockquoteRegex.exec(line))) {
			tokens.push({
				type: 'blockquote',
				indent: match[1],
				depth: indentToDepth(match[1]),
				lineEnd: false,
				lineStart: true,
			})
			subTokenizeText(tokens, match[2], true, false)
		} else if ((match = codeBlockRegex.exec(line))) {
			tokens.push({ type: 'code_block', value: match[1], lineEnd: true, lineStart: true, indent: '', depth: 0 })
		} else if ((match = indentedTextRegex.exec(line))) {
			subTokenizeText(tokens, match[0], true, true, match[1])
		} else if (line.trim() === '') {
			tokens.push({ type: 'blank_line', lineEnd: true, lineStart: true, indent: '', depth: 0 })
		} else {
			subTokenizeText(tokens, line, true, true)
		}
	}
	return tokens
}

const distinctIndents = (nodes: TreeNode[]): string[] => {
	const indents: Set<string> = new Set()
	for (const node of nodes) {
		if (node.indent && !indents.has(node.indent)) {
			indents.add(node.indent)
		}
		if (node.children.length > 0) {
			const childIndents = distinctIndents(node.children)
			for (const indent of childIndents) {
				if (!indents.has(indent)) {
					indents.add(indent)
				}
			}
		}
	}
	return Array.from(indents)
}

const applyIndentation = (node: TreeNode, indent: string) => {
	if (node.type === 'bullet_list' || node.type === 'ordered_list') {
		node.indent = indent
	}
	for (const child of node.children) {
		applyIndentation(child, indent)
	}
}

const buildTree = (tokens: Token[]): TreeNode => {
	const root: TreeNode = { type: 'doc', depth: 0, indent: null, children: [] }
	const stack: TreeNode[] = [root]
	const parentDepth = () => stack[stack.length - 1]?.depth ?? 0
	const parentType = () => stack[stack.length - 1]?.type ?? 'NONE'
	const pushChild = (node: TreeNode) => {
		stack[stack.length - 1].children.push(node)
	}
	const isParent = (...types: string[]) => {
		return types.includes(parentType())
	}

	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i]
		const node: TreeNode = {
			type: token.type,
			indent: token.indent,
			depth: token.depth,
			value: token.value,
			checked: token.checked,
			children: [],
		}

		// console.log(token.type, token.value, parentType())

		if (token.type === 'text') {
			if (token.lineStart && token.indent === '' && isParent('list_item')) {
				while (isParent('list_item', 'bullet_list', 'ordered_list')) {
					stack.pop()
				}
			}
			pushChild(node)
			if (token.lineEnd && isParent('heading', 'blockquote')) {
				stack.pop()
			}
		} else if (token.type === 'blank_line') {
			if (isParent('list_item')) {
				// TODO handle blank lines in list items
				while (isParent('list_item', 'bullet_list', 'ordered_list')) {
					stack.pop()
				}
			}
			pushChild(node)
		} else if (token.type === 'list_item') {
			if (parentType() === 'list_item' && token.depth === parentDepth()) {
				stack.pop()
			}
			if (parentType() === 'list_item' && token.depth < parentDepth()) {
				while (
					stack.length > 1 &&
					isParent('list_item', 'bullet_list', 'ordered_list') &&
					parentDepth() >= token.depth
				) {
					stack.pop()
				}
			}
			if (!isParent('bullet_list', 'ordered_list')) {
				const listNode: TreeNode = {
					type: orderedRegex.test(token.value) ? 'ordered_list' : 'bullet_list',
					indent: token.indent,
					depth: token.depth,
					children: [],
				}
				pushChild(listNode)
				stack.push(listNode)
			}
			pushChild(node)
			stack.push(node)
		} else if (['heading', 'blockquote', 'code_block'].includes(token.type)) {
			if (token.type === 'code_block' && parentType() === 'code_block') {
				stack.pop()
			} else {
				pushChild(node)
				stack.push(node)
			}
		}
	}
	let documentDefaultIndent = '  '
	for (const node of root.children) {
		if (node.type === 'bullet_list' || node.type === 'ordered_list') {
			const indents = distinctIndents([node])
			indents.filter(indent => indent.length > 0).sort((a, b) => a.length - b.length)
			const indent = indents.length > 0 ? indents[0] : undefined
			if (indent && indent.length < documentDefaultIndent.length) {
				documentDefaultIndent = indent
			}
			applyIndentation(node, indent ?? null)
		}
	}
	root.indent = documentDefaultIndent ?? null
	return root
}

const buildProseMirrorNode = (parent: TreeNode, treeNode: TreeNode, index: number): Node => {
	let children: Node[] = []
	for (let i = 0; i < treeNode.children.length; i++) {
		children.push(buildProseMirrorNode(treeNode, treeNode.children[i], i))
	}

	switch (treeNode.type) {
		case 'doc':
			return mimiriSchema.node('doc', { indent: treeNode.indent }, children)
		case 'heading':
			return mimiriSchema.node('heading', { level: treeNode.depth || 1 }, children)
		case 'list_item':
			return mimiriSchema.node(
				'list_item',
				{ checked: treeNode.checked, marker: treeNode.value, indent: treeNode.depth },
				children,
			)
		case 'checkbox_item':
			return mimiriSchema.node('list_item', { checked: treeNode.checked }, children)
		case 'bullet_list':
			return mimiriSchema.node('bullet_list', { indent: treeNode.indent }, children)
		case 'ordered_list':
			return mimiriSchema.node('ordered_list', { indent: treeNode.indent }, children)
		case 'blockquote':
			return mimiriSchema.node('blockquote', null, children)
		case 'code_block':
			return mimiriSchema.node('code_block', { language: treeNode.value }, children)
		case 'blank_line':
			if (parent?.type === 'code_block') {
				return mimiriSchema.text('\n')
			} else if (parent?.type === 'heading' || parent?.type === 'blockquote') {
				return mimiriSchema.text('a')
			} else {
				return mimiriSchema.node('paragraph', null, [])
			}
		case 'text':
			if (parent?.type === 'code_block') {
				if (index > 0) {
					return mimiriSchema.text(`\n${treeNode.value}`)
				} else {
					return mimiriSchema.text(treeNode.value ?? '')
				}
			} else if (parent?.type === 'heading' || parent?.type === 'blockquote') {
				return mimiriSchema.text(treeNode.value ?? 'a')
			} else {
				return mimiriSchema.node('paragraph', null, [mimiriSchema.text(treeNode.value ?? 'a')])
			}
		default:
			throw new Error(`Unknown node type: ${treeNode.type}`)
	}
}

export const deserialize = (text: string) => {
	const tokens = tokenize(text.replace(/\r\n/g, '\n').replace(/\r/g, '\n'))
	const tree = buildTree(tokens)
	// console.log('tree', tree)
	const doc2 = buildProseMirrorNode(null, tree, 0)
	// console.log('des', doc2)

	const doc = mimiriSchema.node('doc', null, [
		mimiriSchema.node('paragraph', null, [mimiriSchema.text('Hello world!')]),
	])
	return doc2
}
