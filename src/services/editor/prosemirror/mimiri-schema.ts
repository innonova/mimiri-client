import { Schema, type NodeSpec, type MarkSpec } from 'prosemirror-model'

export const nodes: { [key: string]: NodeSpec } = {
	doc: {
		content: 'block+',
		attrs: { indent: { default: null }, history: { default: false } },
	},

	paragraph: {
		content: 'inline*',
		group: 'block',
		parseDOM: [{ tag: 'p' }],
		toDOM() {
			return ['p', 0]
		},
	},

	blockquote: {
		content: 'block+',
		group: 'block',
		defining: true,
		parseDOM: [{ tag: 'blockquote' }],
		toDOM() {
			return ['blockquote', 0]
		},
	},

	bullet_list: {
		content: 'list_item+',
		attrs: { indent: { default: null }, hideListMarker: { default: false } },
		group: 'block',
		parseDOM: [{ tag: 'ul' }],
		toDOM() {
			return ['ul', 0]
		},
	},

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
	},

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
	},

	horizontal_rule: {
		group: 'block',
		parseDOM: [{ tag: 'hr' }],
		toDOM() {
			return ['hr']
		},
	},

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
	},

	conflict_block: {
		attrs: {
			localContent: { default: '' },
			serverContent: { default: '' },
			codeBlockLanguage: { default: null },
		},
		group: 'block',
		atom: true,
		parseDOM: [{ tag: 'div.conflict-block' }],
		toDOM(node) {
			return [
				'div',
				{ class: 'conflict-block' },
				[
					'conflictlens',
					{ contenteditable: 'false', 'data-pm-ignore': 'true' },
					['a', { 'data-action': 'keep-local' }, 'Keep Local'],
					['div', '|'],
					['a', { 'data-action': 'keep-server' }, 'Keep Server'],
					['div', '|'],
					['a', { 'data-action': 'keep-both' }, 'Keep Both'],
				],
				['div', { class: 'conflict-marker conflict-marker-start' }, '<<<<<<< Local'],
				['div', { class: 'conflict-local-content' }, node.attrs.localContent],
				['div', { class: 'conflict-marker conflict-marker-separator' }, '======='],
				['div', { class: 'conflict-server-content' }, node.attrs.serverContent],
				['div', { class: 'conflict-marker conflict-marker-end' }, '>>>>>>> Server'],
			]
		},
	},

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
		toDOM(node) {
			return [
				'div',
				[
					'codelens',
					{ contenteditable: 'false', 'data-pm-ignore': 'true' },
					['a', { 'data-action': 'copy-block' }, 'Copy '],
					['div', '|'],
					['a', { 'data-action': 'select-block' }, 'Select'],
					['div', '|'],
					['a', { 'data-action': 'copy-next-line' }, 'Copy Next Line'],
					['div', '|'],
					['a', { 'data-action': 'unwrap-block' }, 'Unwrap'],
					['div', '|'],
					['a', { 'data-action': 'choose-language' }, `Language: ${node.attrs.language || 'plain'}`],
				],
				['pre', ['code', 0]],
			]
		},
	},

	text: {
		group: 'inline',
	},

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
			const { src, alt, title } = node.attrs
			return ['img', { src, alt, title }]
		},
	},

	hard_break: {
		inline: true,
		group: 'inline',
		selectable: false,
		parseDOM: [{ tag: 'br' }],
		toDOM() {
			return ['br']
		},
	},
}

export const marks: { [key: string]: MarkSpec } = {
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
			const { href, title } = node.attrs
			return ['a', { href, title }, 0]
		},
	},

	em: {
		parseDOM: [
			{ tag: 'i' },
			{ tag: 'em' },
			{ style: 'font-style=italic' },
			{ style: 'font-style=normal', clearMark: m => m.type.name == 'em' },
		],
		toDOM() {
			return ['em', 0]
		},
	},

	strong: {
		parseDOM: [
			{ tag: 'strong' },
			{ tag: 'b', getAttrs: (node: HTMLElement) => node.style.fontWeight != 'normal' && null },
			{ style: 'font-weight=400', clearMark: m => m.type.name == 'strong' },
			{ style: 'font-weight', getAttrs: (value: string) => /^(bold(er)?|[5-9]\d{2,})$/.test(value) && null },
		],
		toDOM() {
			return ['strong', 0]
		},
	},

	code: {
		code: true,
		parseDOM: [{ tag: 'code' }],
		toDOM() {
			return ['code', 0]
		},
	},

	password: {
		code: true,
		parseDOM: [{ tag: 'password' }],
		toDOM() {
			return ['password', 0]
		},
	},
}

export const mimiriSchema = new Schema({ nodes, marks })
