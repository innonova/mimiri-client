import { editor } from 'monaco-editor'
import type { BundledTheme, ThemeRegistration } from 'shiki'
import { bundledThemes } from 'shiki'

/**
 * Unified theme configuration for both Monaco and ProseMirror/Shiki editors
 */
export interface EditorTheme {
	id: string
	label: string
	description: string
	isDark: boolean
	monacoTheme: string
	shikiTheme: BundledTheme
}

/**
 * Available editor themes
 */
export const EDITOR_THEMES: EditorTheme[] = [
	{
		id: 'github-dark',
		label: 'GitHub Dark',
		description: "GitHub's dark theme",
		isDark: true,
		monacoTheme: 'mimiri-github-dark',
		shikiTheme: 'github-dark',
	},
	{
		id: 'github-dark-default',
		label: 'GitHub Dark (Default)',
		description: "GitHub's default dark theme",
		isDark: true,
		monacoTheme: 'mimiri-github-dark-default',
		shikiTheme: 'github-dark-default',
	},
	{
		id: 'github-light',
		label: 'GitHub Light',
		description: "GitHub's light theme",
		isDark: false,
		monacoTheme: 'mimiri-github-light',
		shikiTheme: 'github-light',
	},
	{
		id: 'one-dark-pro',
		label: 'One Dark Pro',
		description: "Atom's iconic One Dark theme",
		isDark: true,
		monacoTheme: 'mimiri-one-dark-pro',
		shikiTheme: 'one-dark-pro',
	},
	{
		id: 'monokai',
		label: 'Monokai',
		description: 'Classic Monokai theme',
		isDark: true,
		monacoTheme: 'mimiri-monokai',
		shikiTheme: 'monokai',
	},
	{
		id: 'dark-plus',
		label: 'Dark+ (VS Code)',
		description: "VS Code's default dark theme",
		isDark: true,
		monacoTheme: 'mimiri-dark-plus',
		shikiTheme: 'dark-plus',
	},
	{
		id: 'light-plus',
		label: 'Light+ (VS Code)',
		description: "VS Code's default light theme",
		isDark: false,
		monacoTheme: 'mimiri-light-plus',
		shikiTheme: 'light-plus',
	},
	{
		id: 'solarized-dark',
		label: 'Solarized Dark',
		description: 'Solarized dark color scheme',
		isDark: true,
		monacoTheme: 'mimiri-solarized-dark',
		shikiTheme: 'solarized-dark',
	},
	{
		id: 'solarized-light',
		label: 'Solarized Light',
		description: 'Solarized light color scheme',
		isDark: false,
		monacoTheme: 'mimiri-solarized-light',
		shikiTheme: 'solarized-light',
	},
]

/**
 * Get theme by ID, with fallback to default theme based on dark mode
 */
export function getThemeById(themeId: string | undefined, isDarkMode: boolean): EditorTheme {
	if (themeId) {
		const theme = EDITOR_THEMES.find(t => t.id === themeId)
		if (theme) {
			return theme
		}
	}

	// Fallback to default theme based on dark mode
	return isDarkMode
		? EDITOR_THEMES.find(t => t.id === 'github-dark')!
		: EDITOR_THEMES.find(t => t.id === 'github-light')!
}

/**
 * Get dark/light theme pairs (for auto-switching based on system theme)
 */
export function getThemePair(themeId: string): { dark: EditorTheme; light: EditorTheme } {
	const theme = EDITOR_THEMES.find(t => t.id === themeId)

	if (!theme) {
		return {
			dark: EDITOR_THEMES.find(t => t.id === 'github-dark')!,
			light: EDITOR_THEMES.find(t => t.id === 'github-light')!,
		}
	}

	// Map themes to their light/dark counterparts
	const themePairs: { [key: string]: { dark: string; light: string } } = {
		'github-dark': { dark: 'github-dark', light: 'github-light' },
		'github-dark-default': { dark: 'github-dark-default', light: 'github-light' },
		'github-light': { dark: 'github-dark', light: 'github-light' },
		'one-dark-pro': { dark: 'one-dark-pro', light: 'light-plus' },
		monokai: { dark: 'monokai', light: 'light-plus' },
		'dark-plus': { dark: 'dark-plus', light: 'light-plus' },
		'light-plus': { dark: 'dark-plus', light: 'light-plus' },
		'solarized-dark': { dark: 'solarized-dark', light: 'solarized-light' },
		'solarized-light': { dark: 'solarized-dark', light: 'solarized-light' },
	}

	const pair = themePairs[themeId] || { dark: 'github-dark', light: 'github-light' }

	return {
		dark: EDITOR_THEMES.find(t => t.id === pair.dark)!,
		light: EDITOR_THEMES.find(t => t.id === pair.light)!,
	}
}

/**
 * Extract colors from a Shiki theme and convert to Monaco format
 */
async function loadShikiTheme(themeName: BundledTheme) {
	const themeImport = bundledThemes[themeName]
	if (!themeImport) {
		throw new Error(`Theme ${themeName} not found in bundled themes`)
	}
	const loaded = await themeImport()
	return loaded.default
}

/**
 * Convert Shiki theme to Monaco theme definition
 */
function convertShikiThemeToMonaco(
	shikiTheme: ThemeRegistration,
	monacoThemeName: string,
	mimiriTokenOverrides?: editor.ITokenThemeRule[],
): editor.IStandaloneThemeData {
	const isDark = shikiTheme.type === 'dark'
	const baseTheme = isDark ? 'vs-dark' : 'vs'

	// Extract basic colors
	const bg = shikiTheme.bg || (isDark ? '#1e1e1e' : '#ffffff')
	const fg = shikiTheme.fg || (isDark ? '#d4d4d4' : '#000000')

	// Convert all Shiki token colors to Monaco rules
	// With TextMate grammars, we can use the full TextMate scope names directly
	const rules: editor.ITokenThemeRule[] = []

	if (shikiTheme.tokenColors) {
		for (const tokenColor of shikiTheme.tokenColors) {
			if (!tokenColor.scope || !tokenColor.settings) {
				continue
			}

			const scopes = Array.isArray(tokenColor.scope) ? tokenColor.scope : [tokenColor.scope]
			const foreground = tokenColor.settings.foreground?.replace('#', '')
			const fontStyle = tokenColor.settings.fontStyle

			if (foreground) {
				for (const scope of scopes) {
					rules.push({
						token: scope,
						foreground,
						fontStyle: fontStyle || undefined,
					})
				}
			}
		}
	}

	// Add Mimiri-specific token overrides (these take precedence)
	if (mimiriTokenOverrides) {
		rules.push(...mimiriTokenOverrides)
	}

	return {
		base: baseTheme,
		inherit: true,
		rules: rules,
		colors: {
			'editor.background': bg,
			'editor.foreground': fg,
		},
	}
}

/**
 * Get Mimiri-specific token overrides for a theme
 */
function getMimiriTokenOverrides(shikiTheme: any): editor.ITokenThemeRule[] {
	const isDark = shikiTheme.type === 'dark'
	const fg = shikiTheme.fg || (isDark ? '#d4d4d4' : '#000000')

	// Find heading color from theme or use a default
	let headingColor = '4fc1ff'
	if (shikiTheme.tokenColors) {
		const headingSetting = shikiTheme.tokenColors.find(
			s =>
				s.scope &&
				((Array.isArray(s.scope) && s.scope.some(sc => sc.includes('heading'))) ||
					(!Array.isArray(s.scope) && s.scope.includes('heading'))),
		)
		if (headingSetting?.settings?.foreground) {
			headingColor = headingSetting.settings.foreground.replace('#', '')
		}
	}

	// Find error/conflict colors
	const errorSetting = shikiTheme.tokenColors?.find(
		s =>
			s.scope &&
			((Array.isArray(s.scope) && s.scope.some(sc => sc.includes('invalid') || sc.includes('error'))) ||
				(!Array.isArray(s.scope) && (s.scope.includes('invalid') || s.scope.includes('error')))),
	)
	const errorColor = errorSetting?.settings?.foreground?.replace('#', '') || (isDark ? 'ff7b72' : 'cf222e')

	// Find warning colors
	const warningSetting = shikiTheme.tokenColors?.find(
		s =>
			s.scope &&
			((Array.isArray(s.scope) && s.scope.some(sc => sc.includes('warning'))) ||
				(!Array.isArray(s.scope) && s.scope.includes('warning'))),
	)
	const warningColor = warningSetting?.settings?.foreground?.replace('#', '') || (isDark ? 'd29922' : '9a6700')

	// Find success/diff add colors
	const successSetting = shikiTheme.tokenColors?.find(
		s =>
			s.scope &&
			((Array.isArray(s.scope) && s.scope.some(sc => sc.includes('markup.inserted') || sc.includes('diff.inserted'))) ||
				(!Array.isArray(s.scope) && (s.scope.includes('markup.inserted') || s.scope.includes('diff.inserted')))),
	)
	const successColor = successSetting?.settings?.foreground?.replace('#', '') || (isDark ? '3fb950' : '1a7f37')

	return [
		{ token: 'directive', foreground: isDark ? '666666' : 'aaaaaa' },
		{ token: 'password', foreground: fg.replace('#', '') },
		{ token: 'checkbox', foreground: isDark ? '666667' : 'aaaaab' },
		{ token: 'checkmark', foreground: fg.replace('#', '') },
		{ token: 'head1', foreground: headingColor, fontStyle: 'bold' },
		{ token: 'head1text', foreground: headingColor, fontStyle: 'bold' },
		{ token: 'italic', foreground: fg.replace('#', ''), fontStyle: 'italic' },
		{ token: 'italictext', foreground: fg.replace('#', ''), fontStyle: 'italic' },
		{ token: 'bold', foreground: fg.replace('#', ''), fontStyle: 'bold' },
		{ token: 'boldtext', foreground: fg.replace('#', ''), fontStyle: 'bold' },
		{ token: 'bolditalic', foreground: isDark ? 'd4d4d4' : '000000', fontStyle: 'bold italic' },
		{ token: 'bolditalictext', foreground: isDark ? 'd4d4d4' : '000000', fontStyle: 'bold italic' },
		{ token: 'conflict-start', foreground: errorColor, background: isDark ? '490202' : 'ffebe9' },
		{ token: 'conflict-separator', foreground: warningColor, background: isDark ? '4a3d1a' : 'fff8c5' },
		{ token: 'conflict-end', foreground: successColor, background: isDark ? '033a16' : 'dafbe1' },
	]
}

let themesInitialized = false

/**
 * Initialize Monaco themes by loading and converting Shiki themes
 * This should be called once during app initialization, before any editors are created
 */
export async function initializeMonacoThemes() {
	if (themesInitialized) {
		return
	}

	themesInitialized = true

	// Load all themes from Shiki and convert them to Monaco format
	const themePromises = EDITOR_THEMES.map(async themeConfig => {
		try {
			const shikiTheme = await loadShikiTheme(themeConfig.shikiTheme)
			const mimiriOverrides = getMimiriTokenOverrides(shikiTheme)
			const monacoTheme = convertShikiThemeToMonaco(shikiTheme, themeConfig.monacoTheme, mimiriOverrides)

			editor.defineTheme(themeConfig.monacoTheme, monacoTheme)
		} catch (error) {
			console.error(`Failed to load theme ${themeConfig.id}:`, error)
			// Fallback to creating a basic theme
			createFallbackMonacoTheme(themeConfig)
		}
	})

	await Promise.all(themePromises)
}

/**
 * Create a fallback Monaco theme if Shiki theme loading fails
 */
function createFallbackMonacoTheme(themeConfig: EditorTheme) {
	const isDark = themeConfig.isDark
	const baseTheme = isDark ? 'vs-dark' : 'vs'

	editor.defineTheme(themeConfig.monacoTheme, {
		base: baseTheme,
		inherit: true,
		rules: [
			{ token: 'directive', foreground: isDark ? '666666' : 'aaaaaa' },
			{ token: 'password', foreground: isDark ? 'd4d4d4' : '000000' },
			{ token: 'checkbox', foreground: isDark ? '666667' : 'aaaaab' },
			{ token: 'checkmark', foreground: isDark ? 'd4d4d4' : '000000' },
			{ token: 'head1', foreground: isDark ? '4fc1ff' : '0969da', fontStyle: 'bold' },
			{ token: 'head1text', foreground: isDark ? '4fc1ff' : '0969da', fontStyle: 'bold' },
			{ token: 'italic', foreground: isDark ? 'd4d4d4' : '000000', fontStyle: 'italic' },
			{ token: 'italictext', foreground: isDark ? 'd4d4d4' : '000000', fontStyle: 'italic' },
			{ token: 'bold', foreground: isDark ? 'd4d4d4' : '000000', fontStyle: 'bold' },
			{ token: 'boldtext', foreground: isDark ? 'd4d4d4' : '000000', fontStyle: 'bold' },
			{ token: 'bolditalic', foreground: isDark ? 'd4d4d4' : '000000', fontStyle: 'bold italic' },
			{ token: 'bolditalictext', foreground: isDark ? 'd4d4d4' : '000000', fontStyle: 'bold italic' },
			{ token: 'conflict-start', foreground: isDark ? 'ff7b72' : 'cf222e', background: isDark ? '490202' : 'ffebe9' },
			{
				token: 'conflict-separator',
				foreground: isDark ? 'd29922' : '9a6700',
				background: isDark ? '4a3d1a' : 'fff8c5',
			},
			{ token: 'conflict-end', foreground: isDark ? '3fb950' : '1a7f37', background: isDark ? '033a16' : 'dafbe1' },
		],
		colors: {
			'editor.background': isDark ? '#1e1e1e' : '#ffffff',
			'editor.foreground': isDark ? '#d4d4d4' : '#000000',
		},
	})
}
