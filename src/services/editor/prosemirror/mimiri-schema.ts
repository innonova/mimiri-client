import { Schema, type NodeSpec, type MarkSpec, type DOMOutputSpec } from 'prosemirror-model'

const pDOM: DOMOutputSpec = ['p', 0],
	blockquoteDOM: DOMOutputSpec = ['blockquote', 0],
	hrDOM: DOMOutputSpec = ['hr'],
	preDOM: DOMOutputSpec = ['pre', ['code', 0]],
	brDOM: DOMOutputSpec = ['br']

export const nodes = {
	doc: {
		content: 'block+',
		attrs: { indent: { default: null } },
	} as NodeSpec,

	paragraph: {
		content: 'inline*',
		group: 'block',
		parseDOM: [{ tag: 'p' }],
		toDOM() {
			return pDOM
		},
	} as NodeSpec,

	blockquote: {
		content: 'block+',
		group: 'block',
		defining: true,
		parseDOM: [{ tag: 'blockquote' }],
		toDOM() {
			return blockquoteDOM
		},
	} as NodeSpec,

	bullet_list: {
		content: 'list_item+',
		attrs: { indent: { default: null } },
		group: 'block',
		parseDOM: [{ tag: 'ul' }],
		toDOM() {
			return ['ul', 0]
		},
	} as NodeSpec,

	ordered_list: {
		content: 'list_item+',
		group: 'block',
		attrs: { order: { default: 1, validate: 'number' }, indent: { default: null } },
		parseDOM: [
			{
				tag: 'ol',
				getAttrs(dom: HTMLElement) {
					return { order: dom.hasAttribute('start') ? parseInt(dom.getAttribute('start') || '1', 10) : 1 }
				},
			},
		],
		toDOM(node) {
			return node.attrs.order == 1 ? ['ol', 0] : ['ol', { start: node.attrs.order }, 0]
		},
	} as NodeSpec,

	list_item: {
		content: 'paragraph block*',
		attrs: {
			checked: { default: null },
			marker: { default: '-' },
			indent: { default: 0 },
		},
		parseDOM: [
			{
				tag: 'li',
				getAttrs(dom) {
					const itemType = dom.getAttribute('data-item-type')
					if (itemType === 'task') {
						const checkedAttr = dom.getAttribute('data-checked')
						return {
							checked: checkedAttr === 'true',
						}
					}
					return {
						checked: null,
					}
				},
			},
		],
		toDOM(node) {
			if (node.attrs.checked !== null) {
				return ['li', { 'data-item-type': 'task', 'data-checked': node.attrs.checked ? 'true' : 'false' }, 0]
			}
			return ['li', 0]
		},
	} as NodeSpec,

	horizontal_rule: {
		group: 'block',
		parseDOM: [{ tag: 'hr' }],
		toDOM() {
			return hrDOM
		},
	} as NodeSpec,

	heading: {
		attrs: { level: { default: 1, validate: 'number' } },
		content: 'inline*',
		group: 'block',
		defining: true,
		parseDOM: [
			{ tag: 'h1', attrs: { level: 1 } },
			{ tag: 'h2', attrs: { level: 2 } },
			{ tag: 'h3', attrs: { level: 3 } },
			{ tag: 'h4', attrs: { level: 4 } },
			{ tag: 'h5', attrs: { level: 5 } },
			{ tag: 'h6', attrs: { level: 6 } },
		],
		toDOM(node) {
			return ['h' + node.attrs.level, 0]
		},
	} as NodeSpec,

	code_block: {
		content: 'text*',
		attrs: {
			language: { default: null },
		},
		marks: '',
		group: 'block',
		code: true,
		defining: true,
		parseDOM: [{ tag: 'pre', preserveWhitespace: 'full' }],
		toDOM() {
			return preDOM
		},
	} as NodeSpec,

	text: {
		group: 'inline',
	} as NodeSpec,

	image: {
		inline: true,
		attrs: {
			src: { validate: 'string' },
			alt: { default: null, validate: 'string|null' },
			title: { default: null, validate: 'string|null' },
		},
		group: 'inline',
		draggable: true,
		parseDOM: [
			{
				tag: 'img[src]',
				getAttrs(dom: HTMLElement) {
					return {
						src: dom.getAttribute('src'),
						title: dom.getAttribute('title'),
						alt: dom.getAttribute('alt'),
					}
				},
			},
		],
		toDOM(node) {
			let { src, alt, title } = node.attrs
			return ['img', { src, alt, title }]
		},
	} as NodeSpec,

	hard_break: {
		inline: true,
		group: 'inline',
		selectable: false,
		parseDOM: [{ tag: 'br' }],
		toDOM() {
			return brDOM
		},
	} as NodeSpec,
}

const emDOM: DOMOutputSpec = ['em', 0],
	strongDOM: DOMOutputSpec = ['strong', 0],
	codeDOM: DOMOutputSpec = ['code', 0]

export const marks = {
	link: {
		attrs: {
			href: { validate: 'string' },
			title: { default: null, validate: 'string|null' },
		},
		inclusive: false,
		parseDOM: [
			{
				tag: 'a[href]',
				getAttrs(dom: HTMLElement) {
					return { href: dom.getAttribute('href'), title: dom.getAttribute('title') }
				},
			},
		],
		toDOM(node) {
			let { href, title } = node.attrs
			return ['a', { href, title }, 0]
		},
	} as MarkSpec,

	em: {
		parseDOM: [
			{ tag: 'i' },
			{ tag: 'em' },
			{ style: 'font-style=italic' },
			{ style: 'font-style=normal', clearMark: m => m.type.name == 'em' },
		],
		toDOM() {
			return emDOM
		},
	} as MarkSpec,

	strong: {
		parseDOM: [
			{ tag: 'strong' },
			{ tag: 'b', getAttrs: (node: HTMLElement) => node.style.fontWeight != 'normal' && null },
			{ style: 'font-weight=400', clearMark: m => m.type.name == 'strong' },
			{ style: 'font-weight', getAttrs: (value: string) => /^(bold(er)?|[5-9]\d{2,})$/.test(value) && null },
		],
		toDOM() {
			return strongDOM
		},
	} as MarkSpec,

	code: {
		code: true,
		parseDOM: [{ tag: 'code' }],
		toDOM() {
			return codeDOM
		},
	} as MarkSpec,
}

export const mimiriSchema = new Schema({ nodes, marks })
