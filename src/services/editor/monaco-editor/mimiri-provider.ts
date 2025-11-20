import { languages } from 'monaco-editor'
import { LANGUAGE_ALIASES, LANGUAGE_DEFINITIONS, LANGUAGES_CURATED, SUPPORTED_LANGUAGES } from '../highlighting'

export const mimiriCompletionProvider = {
	triggerCharacters: [
		'`',
		'a',
		'b',
		'c',
		'd',
		'e',
		'f',
		'g',
		'h',
		'i',
		'j',
		'k',
		'l',
		'm',
		'n',
		'o',
		'p',
		'q',
		'r',
		's',
		't',
		'u',
		'v',
		'w',
		'x',
		'y',
		'z',
	],
	provideCompletionItems: (model, position) => {
		// Only provide suggestions after ``` at the start of a line
		const lineContent = model.getLineContent(position.lineNumber)
		const textBeforeCursor = lineContent.substring(0, position.column - 1)

		// Check if we're right after ``` at the beginning of the line (with optional whitespace)
		const match = textBeforeCursor.match(/^\s*```(\w*)$/)
		if (!match) {
			return { suggestions: [] }
		}

		const userInput = match[1] // What the user has typed after ```
		const hasUserInput = userInput.length > 0

		// Get all available languages from Monaco
		const availableLanguages = languages.getLanguages()

		// Create suggestions
		const suggestions: languages.CompletionItem[] = []
		const addedLanguages = new Set<string>()

		// Add blank/no-language option as first suggestion (only when no user input)
		if (!hasUserInput) {
			suggestions.push({
				label: '(none)',
				kind: languages.CompletionItemKind.Value,
				detail: 'No syntax highlighting',
				insertText: '',
				range: {
					startLineNumber: position.lineNumber,
					startColumn: position.column - match[1].length,
					endLineNumber: position.lineNumber,
					endColumn: position.column,
				},
			})
		}

		// Add main languages (only curated if no user input)
		for (const [langId, info] of Object.entries(LANGUAGE_DEFINITIONS)) {
			// Skip if not in curated list and user hasn't typed anything
			if (!hasUserInput && !LANGUAGES_CURATED.includes(langId)) {
				continue
			}

			const targetMonacoId = info.monacoId || langId

			if (availableLanguages.some(lang => lang.id === targetMonacoId)) {
				suggestions.push({
					label: info.label,
					kind: languages.CompletionItemKind.Value,
					detail: info.detail,
					insertText: info.label,
					range: {
						startLineNumber: position.lineNumber,
						startColumn: position.column - match[1].length,
						endLineNumber: position.lineNumber,
						endColumn: position.column,
					},
				})
				addedLanguages.add(langId)
			}
		}

		// Add any other Monaco languages not in our list (only if user is typing)
		if (hasUserInput) {
			// Add aliases as separate suggestions (only if target language is included)
			for (const [alias, target] of Object.entries(LANGUAGE_ALIASES)) {
				if (addedLanguages.has(target)) {
					const targetInfo = LANGUAGE_DEFINITIONS[target]
					suggestions.push({
						label: alias,
						kind: languages.CompletionItemKind.Value,
						detail: `${targetInfo?.detail || target} (alias)`,
						insertText: alias,
						range: {
							startLineNumber: position.lineNumber,
							startColumn: position.column - match[1].length,
							endLineNumber: position.lineNumber,
							endColumn: position.column,
						},
					})
				}
			}
			for (const lang of availableLanguages) {
				// Check if this monaco language is already covered by one of our added languages
				// This is a bit tricky because addedLanguages contains our keys (e.g. 'bash'), but lang.id is monaco id (e.g. 'shell')
				// But we also want to avoid duplicates if 'shell' is in our list and monaco has 'shell'.

				// Simple check: if lang.id is in addedLanguages, skip.
				if (addedLanguages.has(lang.id)) continue

				// Also check if any added language maps to this monaco id
				const alreadyCovered = Array.from(addedLanguages).some(added => {
					const def = LANGUAGE_DEFINITIONS[added]
					return (def?.monacoId || added) === lang.id
				})

				if (!alreadyCovered && lang.id !== 'plaintext' && !lang.id.startsWith('freemarker2')) {
					suggestions.push({
						label: lang.id,
						kind: languages.CompletionItemKind.Value,
						detail: lang.aliases?.[0] || lang.id,
						insertText: lang.id,
						range: {
							startLineNumber: position.lineNumber,
							startColumn: position.column - match[1].length,
							endLineNumber: position.lineNumber,
							endColumn: position.column,
						},
					})
				}
			}
		}

		return {
			suggestions,
			incomplete: true, // Tell Monaco to re-query as user types
		}
	},
}
