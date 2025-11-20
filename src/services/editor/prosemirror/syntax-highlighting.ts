import { createHighlighter, type Highlighter } from 'shiki'
import { Plugin } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'
import { bundledThemes } from 'shiki'
import { SUPPORTED_LANGUAGES } from '../highlighting'

let highlighter: Highlighter | null = null

export const initHighlighter = async () => {
	console.log('bundledThemes', bundledThemes)

	highlighter = await createHighlighter({
		themes: ['one-dark-pro', 'github-dark-default', 'github-dark', 'github-light', 'monokai', 'dark-plus'],
		langs: SUPPORTED_LANGUAGES,
	})
}

export const syntaxHighlightPlugin = (theme: string = 'dark-plus') => {
	return new Plugin({
		state: {
			init(_, { doc }) {
				return highlighter ? createDecorations(doc, theme) : DecorationSet.empty
			},
			apply(tr, old) {
				if (!highlighter) return old
				return tr.docChanged ? createDecorations(tr.doc, theme) : old
			},
		},
		props: {
			decorations(state) {
				return this.getState(state)
			},
		},
	})
}

const createDecorations = (doc, theme: string) => {
	const decorations = []

	doc.descendants((node, pos) => {
		if (node.type.name === 'code_block' && node.attrs.language) {
			const code = node.textContent
			const lang = node.attrs.language
			let offset = pos + 1

			try {
				const { tokens } = highlighter.codeToTokens(code, { lang, theme })

				tokens.forEach(line => {
					line.forEach(token => {
						const from = offset
						const to = offset + token.content.length

						decorations.push(
							Decoration.inline(from, to, {
								style: `color: ${token.color}`,
							}),
						)

						offset = to
					})
					offset++ // newline
				})
			} catch (e) {
				console.warn(`Highlighting failed for ${lang}:`, e)
			}

			const passwordRegex = /p`([^`\r\n]+)`/g
			let match
			offset = pos + 1

			while ((match = passwordRegex.exec(code))) {
				const start = offset + match.index
				const end = start + match[0].length

				decorations.push(
					Decoration.inline(start + 2, end - 1, {
						class: 'password-literal',
						style: '-webkit-text-security: disc;',
					}),
				)
			}
		}
	})

	return DecorationSet.create(doc, decorations)
}
