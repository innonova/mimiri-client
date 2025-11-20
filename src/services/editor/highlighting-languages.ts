export interface LanguageDefinition {
	label: string
	detail: string
	monacoId?: string
	shikiId?: string
}

export const LANGUAGE_ALIASES: { [key: string]: string } = {
	js: 'javascript',
	ts: 'typescript',
	py: 'python',
	rb: 'ruby',
	sh: 'shell',
	cs: 'csharp',
	md: 'markdown',
	yml: 'yaml',
}

export const LANGUAGE_DEFINITIONS: { [key: string]: LanguageDefinition } = {
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
	bash: { label: 'bash', detail: 'Bash', monacoId: 'shell' },
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

export const LANGUAGES_CURATED = [
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

export const SUPPORTED_LANGUAGES = Object.keys(LANGUAGE_DEFINITIONS)
