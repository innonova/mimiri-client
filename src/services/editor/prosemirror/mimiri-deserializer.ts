import { mimiriSchema } from './mimiri-schema'
import type { Node } from 'prosemirror-model'

const headingRegex = /^(#{1,6})\s+(.*)$/
const listItemRegex = /^(\s*)([-*+]|\d+\.)\s+(?:(\[(?:\s|[xX])\])\s+)?(.*)$/
const blockquoteRegex = /^(\s*)>\s?(.*)$/
const codeBlockRegex = /^```(.*)$/
const indentedTextRegex = /^(\s+)(\S.*)$/
const orderedRegex = /^(\d+)\./

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
	inCodeBlock: boolean = false,
): void => {
	const startIdx = tokens.length
	let i = 0
	let currentText = ''

	const flushText = () => {
		if (currentText) {
			tokens.push({
				type: 'text',
				value: currentText,
				lineEnd: false,
				lineStart: false,
				indent: '',
				depth: 0,
			})
			currentText = ''
		}
	}

	// If we're in a code block, don't process any markdown, just treat everything as text
	if (inCodeBlock) {
		tokens.push({
			type: 'text',
			value: text,
			lineEnd,
			lineStart,
			indent,
			depth: indentToDepth(indent),
		})
		return
	}

	const findClosing = (startIdx: number, delimiter: string): number => {
		let idx = startIdx + delimiter.length
		while (idx <= text.length - delimiter.length) {
			// Check for escape
			if (text[idx - 1] === '\\') {
				idx++
				continue
			}
			if (text.substring(idx, idx + delimiter.length) === delimiter) {
				return idx
			}
			idx++
		}
		return -1
	}

	const findLinkEnd = (startIdx: number): { textEnd: number; urlEnd: number } | null => {
		let idx = startIdx + 1
		let depth = 1

		// Find closing ] for link text
		while (idx < text.length) {
			if (text[idx - 1] === '\\') {
				idx++
				continue
			}
			if (text[idx] === '[') depth++
			if (text[idx] === ']') {
				depth--
				if (depth === 0) break
			}
			idx++
		}

		if (depth !== 0 || idx >= text.length) return null
		const textEnd = idx

		// Check for opening (
		if (text[idx + 1] !== '(') return null
		idx += 2

		// Find closing ) for URL
		depth = 1
		while (idx < text.length) {
			if (text[idx - 1] === '\\') {
				idx++
				continue
			}
			if (text[idx] === '(') depth++
			if (text[idx] === ')') {
				depth--
				if (depth === 0) return { textEnd, urlEnd: idx }
			}
			idx++
		}

		return null
	}

	while (i < text.length) {
		const char = text[i]

		// Handle escape sequences
		if (char === '\\' && i + 1 < text.length) {
			const nextChar = text[i + 1]
			if ('*_[]()\\`'.includes(nextChar)) {
				currentText += nextChar
				i += 2
				continue
			}
		}
		// Check for strong emphasis: ***text*** or ___text___
		if (
			(char === '*' && text[i + 1] === '*' && text[i + 2] === '*') ||
			(char === '_' && text[i + 1] === '_' && text[i + 2] === '_')
		) {
			const delimiter = char + text[i + 1] + text[i + 2]
			const closingIdx = findClosing(i, delimiter)
			if (closingIdx !== -1) {
				flushText()
				const content = text.substring(i + delimiter.length, closingIdx)
				tokens.push({
					type: 'strong_emphasis',
					value: content,
					lineEnd: false,
					lineStart: false,
					indent: '',
					depth: 0,
				})
				console.log(tokens[tokens.length - 1])

				i = closingIdx + delimiter.length
				continue
			}
		}

		// Check for strong: **text** or __text__
		if ((char === '*' && text[i + 1] === '*') || (char === '_' && text[i + 1] === '_')) {
			const delimiter = char + text[i + 1]
			const closingIdx = findClosing(i, delimiter)
			if (closingIdx !== -1) {
				flushText()
				const content = text.substring(i + delimiter.length, closingIdx)
				tokens.push({
					type: 'strong',
					value: content,
					lineEnd: false,
					lineStart: false,
					indent: '',
					depth: 0,
				})
				i = closingIdx + delimiter.length
				continue
			}
		}

		// Check for emphasis: *text* or _text_
		if (char === '*' || char === '_') {
			const closingIdx = findClosing(i, char)
			if (closingIdx !== -1) {
				flushText()
				const content = text.substring(i + 1, closingIdx)
				tokens.push({
					type: 'emphasis',
					value: content,
					lineEnd: false,
					lineStart: false,
					indent: '',
					depth: 0,
				})
				i = closingIdx + 1
				continue
			}
		}

		// Check for inline password: p`password`
		if (text[i] === 'p' && text[i + 1] === '`') {
			const closingIdx = findClosing(i + 1, '`')
			if (closingIdx !== -1) {
				flushText()
				const content = text.substring(i + 2, closingIdx)
				tokens.push({
					type: 'password',
					value: content,
					lineEnd: false,
					lineStart: false,
					indent: '',
					depth: 0,
				})
				i = closingIdx + 1
				continue
			}
		}

		// Check for inline code: `code`
		if (char === '`') {
			const closingIdx = findClosing(i, '`')
			if (closingIdx !== -1) {
				flushText()
				const content = text.substring(i + 1, closingIdx)
				tokens.push({
					type: 'code',
					value: content,
					lineEnd: false,
					lineStart: false,
					indent: '',
					depth: 0,
				})
				i = closingIdx + 1
				continue
			}
		}

		// Check for links: [text](url)
		if (char === '[') {
			const linkEnd = findLinkEnd(i)
			if (linkEnd) {
				flushText()
				const linkText = text.substring(i + 1, linkEnd.textEnd)
				const linkUrl = text.substring(linkEnd.textEnd + 2, linkEnd.urlEnd)
				tokens.push({
					type: 'link',
					value: JSON.stringify({ text: linkText, url: linkUrl }),
					lineEnd: false,
					lineStart: false,
					indent: '',
					depth: 0,
				})
				i = linkEnd.urlEnd + 1
				continue
			}
		}

		// Regular character
		currentText += char
		i++
	}

	flushText()

	// Apply lineStart and lineEnd to the first and last tokens added
	if (tokens.length > startIdx) {
		const firstToken = tokens[startIdx]
		const lastToken = tokens[tokens.length - 1]

		if (lineStart) {
			firstToken.lineStart = true
			firstToken.indent = indent
			firstToken.depth = indentToDepth(indent)
		}

		if (lineEnd) {
			lastToken.lineEnd = true
		}
	}
}

const tokenize = (text: string): Token[] => {
	const lines = text.split('\n') //.slice(0, 10)
	const tokens: Token[] = []
	let inCodeBlock = false

	for (const line of lines) {
		let match

		if ((match = codeBlockRegex.exec(line))) {
			tokens.push({ type: 'code_block', value: match[1], lineEnd: true, lineStart: true, indent: '', depth: 0 })
			inCodeBlock = !inCodeBlock
		} else if (inCodeBlock) {
			// If we're in a code block, treat everything as text without processing markdown
			subTokenizeText(tokens, line, true, true, '', true)
		} else if ((match = headingRegex.exec(line))) {
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

		const isInlineToken = ['text', 'strong', 'emphasis', 'strong_emphasis', 'code', 'link', 'password'].includes(
			token.type,
		)

		if (isInlineToken) {
			if (token.lineStart && token.indent === '' && isParent('list_item')) {
				while (isParent('list_item', 'bullet_list', 'ordered_list')) {
					stack.pop()
				}
			}

			// Check if we need to create a paragraph wrapper for inline content
			// Paragraphs are needed when the parent is NOT heading, blockquote, or already a paragraph
			// List items DO need paragraphs as they contain block content
			const needsParagraph = !isParent('heading', 'blockquote', 'paragraph', 'code_block')

			if (needsParagraph) {
				// Start a new paragraph (will hold all inline tokens until lineEnd)
				const paragraphNode: TreeNode = {
					type: 'paragraph',
					indent: '',
					depth: 0,
					children: [],
				}
				pushChild(paragraphNode)
				stack.push(paragraphNode)
			}

			pushChild(node)

			if (token.lineEnd) {
				// Close paragraph if we're in one
				if (isParent('paragraph')) {
					stack.pop()
				}
				// Also close heading/blockquote if we're at line end
				if (isParent('heading', 'blockquote')) {
					stack.pop()
				}
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
		case 'paragraph':
			return mimiriSchema.node('paragraph', null, children)
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
			} else {
				// Text is always inline, no paragraph wrapping here
				return mimiriSchema.text(treeNode.value ?? '')
			}
		case 'strong':
			// Create text node with strong mark (always inline)
			return mimiriSchema.text(treeNode.value ?? '', [mimiriSchema.mark('strong')])
		case 'emphasis':
			// Create text node with em mark (always inline)
			return mimiriSchema.text(treeNode.value ?? '', [mimiriSchema.mark('em')])
		case 'strong_emphasis':
			// Create text node with strong and em marks (always inline)
			return mimiriSchema.text(treeNode.value ?? '', [mimiriSchema.mark('strong'), mimiriSchema.mark('em')])
		case 'code':
			// Create text node with code mark (always inline)
			return mimiriSchema.text(treeNode.value ?? '', [mimiriSchema.mark('code')])
		case 'link':
			// Parse link data and create text node with link mark (always inline)
			const linkData = JSON.parse(treeNode.value ?? '{"text":"","url":""}')
			return mimiriSchema.text(linkData.text, [mimiriSchema.mark('link', { href: linkData.url, title: null })])
		case 'password':
			// Create text node with password mark (always inline)
			return mimiriSchema.text(treeNode.value ?? '', [mimiriSchema.mark('password')])
		default:
			throw new Error(`Unknown node type: ${treeNode.type}`)
	}
}

export const deserialize = (text: string) => {
	const tokens = tokenize(text.replace(/\r\n/g, '\n').replace(/\r/g, '\n'))
	console.log('tokens', tokens)
	const tree = buildTree(tokens)
	console.log('tree', tree)
	const doc2 = buildProseMirrorNode(null, tree, 0)
	// console.log('des', doc2)

	const doc = mimiriSchema.node('doc', null, [
		mimiriSchema.node('paragraph', null, [mimiriSchema.text('Hello world!')]),
	])
	return doc2
}
