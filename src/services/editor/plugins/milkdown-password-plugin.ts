import { $prose, $inputRule } from '@milkdown/utils'
import { Plugin, PluginKey } from '@milkdown/prose/state'
import { Decoration, DecorationSet } from '@milkdown/prose/view'
import { InputRule } from '@milkdown/prose/inputrules'
import type { TextEditorListener } from '../type'

// Plugin key for password decoration
const passwordPluginKey = new PluginKey('password-decoration')

// Store password data for click handling
const passwordDataMap = new Map<string, { text: string; element?: HTMLElement }>()

// Factory function to create the plugin with listener
const createPasswordDecorationPlugin = (listener: TextEditorListener) =>
	new Plugin({
		key: passwordPluginKey,
		state: {
			init(_, { doc }) {
				return findPasswordDecorations(doc, null)
			},
			apply(tr, oldState, _, newState) {
				return findPasswordDecorations(tr.doc, newState.selection)
			},
		},
		props: {
			decorations(state) {
				return this.getState(state)
			},
			handleDOMEvents: {
				dblclick(view, event) {
					const target = event.target as HTMLElement
					// Check if double-clicking on styled password text
					if (target.classList.contains('password-inline-code')) {
						const posKey = target.getAttribute('data-password-pos')
						if (posKey) {
							const passwordData = passwordDataMap.get(posKey)
							if (passwordData) {
								// Get position in pixels
								const rect = target.getBoundingClientRect()
								const top = rect.top
								const left = rect.right

								// Call listener with position and password text
								listener.onPasswordClicked(top, left, passwordData.text)
								return true
							}
						}
					}
					return false
				},
			},
		},
	})

function findPasswordDecorations(doc: any, selection: any) {
	const decorations: Decoration[] = []
	const processedPositions = new Set<number>()

	doc.descendants((node: any, pos: number) => {
		// Look for text nodes containing p`...` pattern
		if (node.isText && node.text && !processedPositions.has(pos)) {
			const text = node.text
			const regex = /p`([^`]+)`/g
			let match: RegExpExecArray | null

			while ((match = regex.exec(text)) !== null) {
				const fullMatch = match[0] // p`...`
				const password = match[1]
				const matchStart = pos + match.index
				const matchEnd = matchStart + fullMatch.length

				// Calculate positions for each part: "p" "`" password "`"
				const pStart = matchStart // "p"
				const pEnd = pStart + 1
				const firstTickStart = pEnd // "`"
				const passwordStart = firstTickStart + 1 // after "p`"
				const passwordEnd = matchEnd - 1 // before closing "`"

				processedPositions.add(matchStart)

				const posKey = String(matchStart)

				// Store password data for click handling
				passwordDataMap.set(posKey, { text: password })

				// Style "p`" prefix as subdued
				const stylePrefix = Decoration.inline(pStart, passwordStart, {
					class: 'text-text-secondary password-prefix',
				})

				// Style the password content (always hidden)
				const stylePassword = Decoration.inline(passwordStart, passwordEnd, {
					class: 'password-inline-code password-hidden',
					'data-password-pos': posKey,
					style: 'cursor: pointer;',
				})

				// Style closing "`" as subdued
				const styleSuffix = Decoration.inline(passwordEnd, matchEnd, {
					class: 'text-text-secondary password-suffix',
				})

				decorations.push(stylePrefix, stylePassword, styleSuffix)
			}
		}
	})

	return DecorationSet.create(doc, decorations)
}

// Plugin to intercept inlineCode creation and convert p`...` back to escaped plain text
const passwordConversionPlugin = new Plugin({
	key: new PluginKey('password-conversion'),
	appendTransaction(transactions, oldState, newState) {
		const tr = newState.tr
		let modified = false

		newState.doc.descendants((node, pos, parent) => {
			// Look for text nodes with inlineCode mark
			if (node.isText && node.marks.some(mark => mark.type.name === 'code_inline' || mark.type.name === 'inlineCode')) {
				// Check if the previous character/node is "p"
				const beforePos = pos - 1
				if (beforePos >= 0) {
					const $pos = newState.doc.resolve(pos)
					const parentNode = $pos.parent

					// Get text before this position in the same parent
					let textBefore = ''
					parentNode.forEach((child, offset, index) => {
						const childPos = $pos.start() + offset
						if (childPos < pos && child.isText) {
							textBefore += child.text
						}
					})

					// If previous text ends with "p", convert this inlineCode to plain text
					if (textBefore.endsWith('p')) {
						const codeText = node.text || ''
						const from = pos
						const to = pos + node.nodeSize

						// Remove the "p" from the previous position
						const pPos = pos - 1

						// Replace: remove "p", remove inlineCode mark, add plain text with backticks
						tr.delete(pPos, to)
						tr.insert(pPos, newState.schema.text('p`' + codeText + '`'))
						modified = true
					}
				}
			}
		})

		return modified ? tr : null
	},
})

// Input rule to handle p`...` typed by user (keep as plain text)
export const passwordInputRule = $inputRule(
	() =>
		new InputRule(/p`([^`]+)`$/, (state, match, start, end) => {
			const password = match[1]
			const tr = state.tr

			// Keep it as plain text (this may not be needed if conversion plugin handles it)
			tr.replaceWith(start, end, state.schema.text('p`' + password + '`'))

			return tr
		}),
)

// Export factory function that takes listener
export const createPasswordPlugin = (listener: TextEditorListener) =>
	$prose(() => createPasswordDecorationPlugin(listener))

export const passwordConversionPluginExport = $prose(() => passwordConversionPlugin)
