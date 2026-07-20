import { editor } from '../selectors'
import type { EditorMode } from './mode'

// Accessors for the in-editor find/replace UI. The behavior contract is the
// same in both editors, but the widget DOM differs: ProseMirror uses the
// Mimiri find bar (data-testids), Monaco its built-in find widget (classes).
// Both use the same visible strings for the match counter ('1 of 3',
// 'No results'), so count assertions are portable.
const monacoWidget = () => editor.monacoContainer().locator('.find-widget')

export const findUI = {
	// Monaco keeps the closed widget in the DOM (moved off-screen); shown state
	// is expressed by the 'visible' class
	bar: (mode: EditorMode) => (mode === 'code' ? editor.monacoContainer().locator('.find-widget.visible') : editor.findBar()),
	input: (mode: EditorMode) =>
		mode === 'code' ? monacoWidget().locator('.find-part textarea.input') : editor.findInput(),
	replaceInput: (mode: EditorMode) =>
		mode === 'code' ? monacoWidget().locator('.replace-part textarea.input') : editor.findReplaceInput(),
	count: (mode: EditorMode) => (mode === 'code' ? monacoWidget().locator('.matchesCount') : editor.findCount()),
	prev: (mode: EditorMode) =>
		mode === 'code' ? monacoWidget().locator('.codicon-find-previous-match') : editor.findPrev(),
	next: (mode: EditorMode) => (mode === 'code' ? monacoWidget().locator('.codicon-find-next-match') : editor.findNext()),
	caseToggle: (mode: EditorMode) =>
		mode === 'code' ? monacoWidget().locator('.codicon-case-sensitive') : editor.findCase(),
	wholeWordToggle: (mode: EditorMode) =>
		mode === 'code' ? monacoWidget().locator('.codicon-whole-word') : editor.findWholeWord(),
	regexToggle: (mode: EditorMode) => (mode === 'code' ? monacoWidget().locator('.codicon-regex') : editor.findRegex()),
	replaceButton: (mode: EditorMode) =>
		mode === 'code' ? monacoWidget().locator('.codicon-find-replace') : editor.findReplace(),
	replaceAllButton: (mode: EditorMode) =>
		mode === 'code' ? monacoWidget().locator('.codicon-find-replace-all') : editor.findReplaceAll(),
}
