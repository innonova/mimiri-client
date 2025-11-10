import { languages } from 'monaco-editor'

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

		// Curated list of most common languages to show by default
		const curatedLanguages = [
			'javascript',
			'typescript',
			'python',
			'java',
			'html',
			'css',
			'json',
			'sql',
			'shell',
			'bash',
			'csharp',
		]

		// Common language aliases and their display names
		const languageInfo: { [key: string]: { label: string; detail?: string } } = {
			javascript: { label: 'javascript', detail: 'JavaScript' },
			typescript: { label: 'typescript', detail: 'TypeScript' },
			python: { label: 'python', detail: 'Python' },
			java: { label: 'java', detail: 'Java' },
			csharp: { label: 'csharp', detail: 'C#' },
			cpp: { label: 'cpp', detail: 'C++' },
			c: { label: 'c', detail: 'C' },
			go: { label: 'go', detail: 'Go' },
			rust: { label: 'rust', detail: 'Rust' },
			ruby: { label: 'ruby', detail: 'Ruby' },
			php: { label: 'php', detail: 'PHP' },
			swift: { label: 'swift', detail: 'Swift' },
			kotlin: { label: 'kotlin', detail: 'Kotlin' },
			shell: { label: 'shell', detail: 'Shell / Bash' },
			bash: { label: 'bash', detail: 'Bash' },
			powershell: { label: 'powershell', detail: 'PowerShell' },
			sql: { label: 'sql', detail: 'SQL' },
			html: { label: 'html', detail: 'HTML' },
			css: { label: 'css', detail: 'CSS' },
			scss: { label: 'scss', detail: 'SCSS' },
			json: { label: 'json', detail: 'JSON' },
			xml: { label: 'xml', detail: 'XML' },
			yaml: { label: 'yaml', detail: 'YAML' },
			markdown: { label: 'markdown', detail: 'Markdown' },
			dockerfile: { label: 'dockerfile', detail: 'Dockerfile' },
		}

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
		for (const [langId, info] of Object.entries(languageInfo)) {
			// Skip if not in curated list and user hasn't typed anything
			if (!hasUserInput && !curatedLanguages.includes(langId)) {
				continue
			}

			if (availableLanguages.some(lang => lang.id === langId)) {
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
			// Add common short aliases
			const aliases: { [key: string]: string } = {
				js: 'javascript',
				ts: 'typescript',
				py: 'python',
				rb: 'ruby',
				sh: 'shell',
				cs: 'csharp',
				md: 'markdown',
				bash: 'shell',
			}

			// Add aliases as separate suggestions (only if target language is included)
			for (const [alias, target] of Object.entries(aliases)) {
				if (addedLanguages.has(target)) {
					suggestions.push({
						label: alias,
						kind: languages.CompletionItemKind.Value,
						detail: `${languageInfo[target]?.detail || target} (alias)`,
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
				if (!addedLanguages.has(lang.id) && lang.id !== 'plaintext' && !lang.id.startsWith('freemarker2')) {
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
