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

const identifyPasswordPattern = (line, startIndex: number, startOffset: number) => {
	const token = line[startIndex]
	let searchIdx: number
	let searchOffset: number

	if (token.content === 'p' && startIndex + 1 < line.length && line[startIndex + 1].content.startsWith('`')) {
		const advance = line[startIndex + 1].content.length === 1 ? 2 : 1
		searchIdx = startIndex + advance
		searchOffset = startOffset + advance
	} else if (token.content.startsWith('p`')) {
		if (token.content.length <= 2) {
			searchIdx = startIndex + 1
			searchOffset = startOffset + 2
		}
	} else {
		return null
	}

	const contentFrom = startOffset + 2

	while (searchIdx < line.length) {
		const tokenText = line[searchIdx].content
		if (tokenText.endsWith('`')) {
			const contentLen = searchOffset + tokenText.length - 1 - contentFrom
			return {
				prefix: {
					from: startOffset,
					to: startOffset + 2,
				},
				content: {
					from: contentFrom,
					to: contentFrom + contentLen,
				},
				closing: {
					from: contentFrom + contentLen,
					to: contentFrom + contentLen + 1,
				},
				consumedChars: searchOffset + tokenText.length - startOffset,
				consumedTokens: searchIdx + 1 - startIndex,
			}
		}
		searchOffset += tokenText.length
		searchIdx++
	}

	return null
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
					for (let i = 0; i < line.length; ) {
						const passwordPattern = identifyPasswordPattern(line, i, offset)
						if (passwordPattern) {
							decorations.push(
								Decoration.inline(passwordPattern.prefix.from, passwordPattern.prefix.to, {
									class: 'password-delimiter',
								}),
							)
							if (passwordPattern.content.from < passwordPattern.content.to) {
								decorations.push(
									Decoration.inline(passwordPattern.content.from, passwordPattern.content.to, {
										class: 'password-content',
									}),
								)
							}
							decorations.push(
								Decoration.inline(passwordPattern.closing.from, passwordPattern.closing.to, {
									class: 'password-delimiter ',
								}),
							)
							offset += passwordPattern.consumedChars
							i += passwordPattern.consumedTokens
						} else {
							const token = line[i]
							decorations.push(
								Decoration.inline(offset, offset + token.content.length, {
									style: `color: ${token.color}`,
								}),
							)
							offset += token.content.length
							i++
						}
					}
					offset++ // newline
				})
			} catch (e) {
				console.warn(`Highlighting failed for ${lang}:`, e)
			}
		}
	})

	return DecorationSet.create(doc, decorations)
}
