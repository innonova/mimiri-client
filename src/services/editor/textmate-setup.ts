import * as vsctm from 'vscode-textmate'
import * as oniguruma from 'vscode-oniguruma'
import * as monaco from 'monaco-editor'

let registryInitialized = false
let grammarRegistry: vsctm.Registry | null = null
let onigLib: vsctm.IOnigLib | null = null

/**
 * Initialize the Oniguruma WASM engine using official vscode-oniguruma
 * This is required for TextMate grammars to work
 */
async function initializeOniguruma(): Promise<vsctm.IOnigLib> {
	if (onigLib) {
		return onigLib
	}

	// Load the WASM file from vscode-oniguruma package
	const response = await fetch('/wasm/onig.wasm')
	const wasmBytes = await response.arrayBuffer()
	await oniguruma.loadWASM(wasmBytes)

	// Create the onigLib interface as required by vscode-textmate
	onigLib = {
		createOnigScanner(patterns: string[]) {
			return new oniguruma.OnigScanner(patterns)
		},
		createOnigString(s: string) {
			return new oniguruma.OnigString(s)
		},
	}

	return onigLib
}

/**
 * Load a TextMate grammar from Shiki's bundled languages
 * Returns IRawGrammar or null for vscode-textmate
 */
async function loadGrammar(scopeName: string): Promise<vsctm.IRawGrammar | null> {
	// Map scope names to dynamic imports
	// Note: Shiki bundles multiple related grammars, so we import the module
	// and then find the grammar with the matching scopeName
	const grammarMap: { [key: string]: () => Promise<any> } = {
		'source.js': () => import('@shikijs/langs/javascript'),
		'source.ts': () => import('@shikijs/langs/typescript'),
		'source.json': () => import('@shikijs/langs/json'),
		'text.html.basic': () => import('@shikijs/langs/html'),
		'source.css': () => import('@shikijs/langs/css'),
		'source.css.scss': () => import('@shikijs/langs/scss'),
		'source.css.less': () => import('@shikijs/langs/less'),
		'source.python': () => import('@shikijs/langs/python'),
		'source.java': () => import('@shikijs/langs/java'),
		'source.cpp': () => import('@shikijs/langs/cpp'),
		'source.c': () => import('@shikijs/langs/c'),
		'source.cs': () => import('@shikijs/langs/csharp'),
		'source.go': () => import('@shikijs/langs/go'),
		'source.rust': () => import('@shikijs/langs/rust'),
		'source.php': () => import('@shikijs/langs/php'),
		'source.ruby': () => import('@shikijs/langs/ruby'),
		'source.shell': () => import('@shikijs/langs/shellscript'),
		'source.yaml': () => import('@shikijs/langs/yaml'),
		'text.xml': () => import('@shikijs/langs/xml'),
		'source.sql': () => import('@shikijs/langs/sql'),
		'text.html.markdown': () => import('@shikijs/langs/markdown'),
	}

	const grammarLoader = grammarMap[scopeName]
	if (!grammarLoader) {
		// Return null for unsupported languages - vscode-textmate handles this gracefully
		// console.debug(`No grammar available for scope: ${scopeName}`)
		return null
	}

	try {
		// Shiki language modules export an array of LanguageRegistration objects
		// Need to find the one that matches our scopeName since they bundle related grammars
		const grammars = await grammarLoader()
		const grammarArray = grammars.default

		// Find the grammar that matches the requested scope name
		const rawGrammar = grammarArray.find((g: any) => g.scopeName === scopeName)

		if (!rawGrammar) {
			console.warn(`No grammar found with scopeName "${scopeName}" in bundle`)
			return null
		}

		// Parse with vscode-textmate's official parser
		return vsctm.parseRawGrammar(JSON.stringify(rawGrammar), `${scopeName}.json`)
	} catch (error) {
		console.warn(`Failed to load grammar for scope: ${scopeName}`, error)
		return null
	}
}

/**
 * Wire a TextMate grammar to Monaco's tokenizer for a specific language
 */
function wireLanguage(languageId: string, grammar: vsctm.IGrammar): monaco.IDisposable {
	return monaco.languages.setTokensProvider(languageId, {
		getInitialState(): monaco.languages.IState {
			return vsctm.INITIAL as monaco.languages.IState
		},

		tokenize(line: string, state: monaco.languages.IState): monaco.languages.ILineTokens {
			const result = grammar.tokenizeLine(line, state as vsctm.StateStack)

			const tokens: monaco.languages.IToken[] = result.tokens.map(token => ({
				startIndex: token.startIndex,
				scopes: token.scopes[token.scopes.length - 1], // Use the most specific scope
			}))

			return {
				tokens,
				endState: result.ruleStack as monaco.languages.IState,
			}
		},
	})
}

/**
 * Initialize the TextMate grammar registry using official vscode-textmate
 */
export async function initializeTextMateGrammars() {
	if (registryInitialized) {
		return grammarRegistry!
	}

	try {
		// Initialize Oniguruma first and get the onigLib
		const onigLibInstance = await initializeOniguruma()

		// Create the grammar registry using official vscode-textmate API
		grammarRegistry = new vsctm.Registry({
			onigLib: Promise.resolve(onigLibInstance),
			loadGrammar: async (scopeName: string) => {
				return await loadGrammar(scopeName)
			},
		})

		// Map Monaco language IDs to TextMate scope names (using actual Shiki scope names)
		const languageToScopeMap = new Map<string, string>()
		languageToScopeMap.set('javascript', 'source.js')
		languageToScopeMap.set('js', 'source.js') // Alias
		languageToScopeMap.set('typescript', 'source.ts')
		languageToScopeMap.set('ts', 'source.ts') // Alias
		languageToScopeMap.set('json', 'source.json')
		languageToScopeMap.set('html', 'text.html.basic')
		languageToScopeMap.set('css', 'source.css')
		languageToScopeMap.set('scss', 'source.css.scss')
		languageToScopeMap.set('less', 'source.css.less')
		languageToScopeMap.set('python', 'source.python')
		languageToScopeMap.set('py', 'source.python') // Alias
		languageToScopeMap.set('java', 'source.java')
		languageToScopeMap.set('cpp', 'source.cpp')
		languageToScopeMap.set('c++', 'source.cpp') // Alias
		languageToScopeMap.set('c', 'source.c')
		languageToScopeMap.set('csharp', 'source.cs')
		languageToScopeMap.set('cs', 'source.cs') // Alias
		languageToScopeMap.set('go', 'source.go')
		languageToScopeMap.set('rust', 'source.rust')
		languageToScopeMap.set('rs', 'source.rust') // Alias
		languageToScopeMap.set('php', 'source.php')
		languageToScopeMap.set('ruby', 'source.ruby')
		languageToScopeMap.set('rb', 'source.ruby') // Alias
		languageToScopeMap.set('shell', 'source.shell')
		languageToScopeMap.set('bash', 'source.shell') // Alias
		languageToScopeMap.set('sh', 'source.shell') // Alias
		languageToScopeMap.set('yaml', 'source.yaml')
		languageToScopeMap.set('yml', 'source.yaml') // Alias
		languageToScopeMap.set('xml', 'text.xml')
		languageToScopeMap.set('sql', 'source.sql')
		languageToScopeMap.set('markdown', 'text.html.markdown')
		languageToScopeMap.set('md', 'text.html.markdown') // Alias

		// Register language aliases with Monaco
		// These are languages that don't exist by default but we want to support
		const aliasesToRegister = [
			{ id: 'bash', aliases: ['Bash'] },
			{ id: 'sh', aliases: ['Shell Script'] },
			{ id: 'js', aliases: ['JavaScript Alias'] },
			{ id: 'ts', aliases: ['TypeScript Alias'] },
			{ id: 'py', aliases: ['Python Alias'] },
			{ id: 'c++', aliases: ['C++ Alias'] },
			{ id: 'cs', aliases: ['C# Alias'] },
			{ id: 'rs', aliases: ['Rust Alias'] },
			{ id: 'rb', aliases: ['Ruby Alias'] },
			{ id: 'yml', aliases: ['YAML Alias'] },
			{ id: 'md', aliases: ['Markdown Alias'] },
		]

		for (const lang of aliasesToRegister) {
			try {
				monaco.languages.register(lang)
			} catch {
				// Language might already be registered, ignore
			}
		}

		// Load and wire each grammar to Monaco
		for (const [languageId, scopeName] of languageToScopeMap) {
			try {
				const grammar = await grammarRegistry.loadGrammar(scopeName)
				if (grammar) {
					wireLanguage(languageId, grammar)
					// console.log(`Loaded TextMate grammar for ${languageId}`)
				}
			} catch (error) {
				console.warn(`Failed to load grammar for ${languageId}:`, error)
			}
		}
		registryInitialized = true
		console.log('TextMate grammars initialized successfully with vscode-textmate')
		return grammarRegistry
	} catch (error) {
		console.error('Failed to initialize TextMate grammars:', error)
		// Don't throw - allow Monaco to fall back to basic tokenization
		return null
	}
}

/**
 * Get the initialized TextMate registry
 */
export function getTextMateRegistry(): vsctm.Registry | null {
	return grammarRegistry
}
