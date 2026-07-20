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

const identifyPasswordPatterns = (text: string, baseOffset: number) => {
	const patterns: Array<{
		prefix: { from: number; to: number }
		content: { from: number; to: number }
		closing: { from: number; to: number }
	}> = []

	let i = 0
	while (i < text.length - 2) {
		// Look for p` pattern
		if (text[i] === 'p' && text[i + 1] === '`') {
			const startOffset = baseOffset + i
			const contentFrom = startOffset + 2
			let j = i + 2

			// Find closing backtick
			while (j < text.length && text[j] !== '`' && text[j] !== '\n') {
				j++
			}

			if (j < text.length && text[j] === '`') {
				const contentTo = baseOffset + j
				patterns.push({
					prefix: { from: startOffset, to: startOffset + 2 },
					content: { from: contentFrom, to: contentTo },
					closing: { from: contentTo, to: contentTo + 1 },
				})
				i = j + 1
				continue
			}
		}
		i++
	}

	return patterns
}

const createDecorations = (doc, theme: string) => {
	const decorations: Decoration[] = []

	doc.descendants((node, pos) => {
		if (node.type.name === 'code_block') {
			const code = node.textContent
			const lang = node.attrs.language
			const baseOffset = pos + 1

			// Always detect password patterns first (language-independent)
			const passwordPatterns = identifyPasswordPatterns(code, baseOffset)

			// Build a set of ranges covered by password patterns for exclusion
			const passwordRanges = passwordPatterns.flatMap(p => [
				{ from: p.prefix.from, to: p.prefix.to },
				{ from: p.content.from, to: p.content.to },
				{ from: p.closing.from, to: p.closing.to },
			])

			// Add password decorations
			for (const pattern of passwordPatterns) {
				decorations.push(
					Decoration.inline(pattern.prefix.from, pattern.prefix.to, {
						class: 'password-delimiter',
					}),
				)
				if (pattern.content.from < pattern.content.to) {
					decorations.push(
						Decoration.inline(pattern.content.from, pattern.content.to, {
							class: 'password-content',
						}),
					)
				}
				decorations.push(
					Decoration.inline(pattern.closing.from, pattern.closing.to, {
						class: 'password-delimiter',
					}),
				)
			}

			// Apply language syntax highlighting if available
			if (lang) {
				try {
					const { tokens } = highlighter.codeToTokens(code, { lang, theme })
					let offset = baseOffset

					tokens.forEach(line => {
						for (const token of line) {
							const tokenStart = offset
							const tokenEnd = offset + token.content.length

							// Skip tokens that overlap with password patterns
							const overlapsPassword = passwordRanges.some(range => tokenStart < range.to && tokenEnd > range.from)

							if (!overlapsPassword) {
								decorations.push(
									Decoration.inline(tokenStart, tokenEnd, {
										style: `color: ${token.color}`,
									}),
								)
							}

							offset = tokenEnd
						}
						offset++ // newline
					})
				} catch (e) {
					console.warn(`Highlighting failed for ${lang}:`, e)
				}
			}
		}
	})

	return DecorationSet.create(doc, decorations)
}
