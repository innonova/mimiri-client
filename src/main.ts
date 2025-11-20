import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import { initializeMonacoThemes } from './services/editor/theme-manager'
import { initializeTextMateGrammars } from './services/editor/textmate-setup'

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
;(self as any).MonacoEnvironment = {
	getWorker: function (workerId, label) {
		switch (label) {
			case 'json':
				return new jsonWorker()
			case 'css':
			case 'scss':
			case 'less':
				return new cssWorker()
			case 'html':
			case 'handlebars':
			case 'razor':
				return new htmlWorker()
			case 'typescript':
			case 'javascript':
				return new tsWorker()
			default:
				return new editorWorker()
		}
	},
}

// Initialize TextMate grammars and Monaco themes before creating the app
async function initializeEditor() {
	// Initialize TextMate grammars first (required for Monaco themes to work with TextMate)
	await initializeTextMateGrammars()

	// Then initialize Monaco themes
	await initializeMonacoThemes()

	// Finally mount the app
	const app = createApp(App)
	app.mount('#app')
}

void initializeEditor()
