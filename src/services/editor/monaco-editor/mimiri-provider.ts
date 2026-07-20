import { languages } from 'monaco-editor'
import { getLanguageSuggestions } from '../language-suggestions'

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

		// Get all available languages from Monaco
		const availableLanguages = languages.getLanguages().map(lang => lang.id)

		// Get language suggestions using shared logic
		const languageSuggestions = getLanguageSuggestions(userInput, availableLanguages)

		// Convert to Monaco completion items
		const suggestions: languages.CompletionItem[] = languageSuggestions.map(suggestion => ({
			label: suggestion.label,
			kind: languages.CompletionItemKind.Value,
			detail: suggestion.detail,
			insertText: suggestion.label === '(none)' ? '' : suggestion.label,
			range: {
				startLineNumber: position.lineNumber,
				startColumn: position.column - match[1].length,
				endLineNumber: position.lineNumber,
				endColumn: position.column,
			},
		}))

		return {
			suggestions,
			incomplete: true, // Tell Monaco to re-query as user types
		}
	},
}
