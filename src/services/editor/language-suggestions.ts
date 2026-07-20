import { LANGUAGE_ALIASES, LANGUAGE_DEFINITIONS, LANGUAGES_CURATED } from './highlighting'

export interface LanguageSuggestion {
	label: string
	detail: string
	isAlias?: boolean
}

/**
 * Get language suggestions based on a query string.
 * Uses the same logic as Monaco's completion provider but in a reusable form.
 *
 * @param query - The search query (can be empty)
 * @param availableLanguages - Optional list of available language IDs to filter by
 * @returns Array of language suggestions
 */
export function getLanguageSuggestions(query: string, availableLanguages?: string[]): LanguageSuggestion[] {
	const hasUserInput = query.length > 0
	const suggestions: LanguageSuggestion[] = []
	const addedLanguages = new Set<string>()

	// Add blank/no-language option as first suggestion (only when no user input)
	if (!hasUserInput) {
		suggestions.push({
			label: '(none)',
			detail: 'No syntax highlighting',
		})
	}

	// Add main languages (only curated if no user input)
	for (const [langId, info] of Object.entries(LANGUAGE_DEFINITIONS)) {
		// Skip if not in curated list and user hasn't typed anything
		if (!hasUserInput && !LANGUAGES_CURATED.includes(langId)) {
			continue
		}

		const targetMonacoId = info.monacoId || langId

		// If availableLanguages is provided, check if this language is available
		if (availableLanguages && !availableLanguages.includes(targetMonacoId)) {
			continue
		}

		suggestions.push({
			label: info.label,
			detail: info.detail,
		})
		addedLanguages.add(langId)
	}

	// Add aliases as separate suggestions (only if user is typing and target language is included)
	if (hasUserInput) {
		for (const [alias, target] of Object.entries(LANGUAGE_ALIASES)) {
			if (addedLanguages.has(target)) {
				const targetInfo = LANGUAGE_DEFINITIONS[target]
				suggestions.push({
					label: alias,
					detail: `${targetInfo?.detail || target} (alias)`,
					isAlias: true,
				})
			}
		}

		// If availableLanguages provided, add any additional languages not in our definitions
		if (availableLanguages) {
			for (const langId of availableLanguages) {
				// Check if already covered
				if (addedLanguages.has(langId)) {
					continue
				}

				// Check if any added language maps to this ID
				const alreadyCovered = Array.from(addedLanguages).some(added => {
					const def = LANGUAGE_DEFINITIONS[added]
					return (def?.monacoId || added) === langId
				})

				if (!alreadyCovered && langId !== 'plaintext' && !langId.startsWith('freemarker2')) {
					suggestions.push({
						label: langId,
						detail: langId,
					})
				}
			}
		}
	}

	// Filter by query if provided
	if (hasUserInput) {
		const queryLower = query.toLowerCase()
		return suggestions.filter(
			suggestion =>
				suggestion.label.toLowerCase().includes(queryLower) || suggestion.detail.toLowerCase().includes(queryLower),
		)
	}

	return suggestions
}
