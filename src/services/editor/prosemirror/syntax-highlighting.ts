import { createHighlighter, type Highlighter } from 'shiki'
import { Plugin } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'
import { SUPPORTED_LANGUAGES } from '../highlighting'
import { EDITOR_THEMES } from '../theme-manager'

let highlighter: Highlighter | null = null

export const initHighlighter = async () => {
	// Load all themes used in the theme manager
	const themes = EDITOR_THEMES.map(t => t.shikiTheme)

	highlighter = await createHighlighter({
		themes,
		langs: SUPPORTED_LANGUAGES,
	})
}

export const syntaxHighlightPlugin = (getTheme: () => string) => {
	return new Plugin({
		state: {
			init(_, { doc }) {
				return highlighter ? createDecorations(doc, getTheme()) : DecorationSet.empty
			},
			apply(tr, old) {
				if (!highlighter) {
					return old
				}
				// Recompute if document changed or if forced (e.g., theme change)
				const forceUpdate = tr.getMeta('forceUpdate')
				return tr.docChanged || forceUpdate ? createDecorations(tr.doc, getTheme()) : old
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
