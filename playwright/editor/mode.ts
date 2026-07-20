import { expect, Locator } from '@playwright/test'
import { mimiri } from '../framework/mimiri-context'
import { editor } from '../selectors'
import { waitForSyncToEnd } from '../core/actions'

// The two user-selectable editor modes. 'code' is Monaco (the "advanced"
// editor), 'wysiwyg' is ProseMirror. Notes open in the global default from
// Settings → General unless they carry their own choice; tests switch via
// the toolbar toggle button — the same path a user takes. The toggle is
// per-note: it records a pending choice that never shows as an unsaved
// change, persisted silently by the regular save triggers (note switch,
// blur, Ctrl+S).
export type EditorMode = 'code' | 'wysiwyg'

export const editorModes: EditorMode[] = ['wysiwyg', 'code']

export const surface = (mode: EditorMode) => (mode === 'code' ? editor.monaco() : editor.proseMirror())

const container = (mode: EditorMode) => (mode === 'code' ? editor.monacoContainer() : editor.proseMirrorContainer())

// Switch the editor to the requested mode via the toolbar toggle if it is not
// already active. Idempotent and cheap when the mode already matches. Opening
// a note applies its per-note editor choice asynchronously (after the implicit
// save of the previous note), so the whole check-and-toggle is retried until
// the requested mode is stable.
export const ensureEditorMode = async (mode: EditorMode) => {
	await expect(async () => {
		if (!(await container(mode).isVisible())) {
			await editor.toggleEditMode().click()
		}
		await expect(container(mode)).toBeVisible({ timeout: 1000 })
		await expect(container(mode === 'code' ? 'wysiwyg' : 'code')).not.toBeVisible({ timeout: 1000 })
	}).toPass({ timeout: 10_000 })
}

// Persist the current note's pending editor choice. A mode toggle never
// lights up the save button (a view switch is not shown as an unsaved
// change), so persist via Ctrl+S, which saves silently.
export const persistEditorMode = async (mode: EditorMode) => {
	await focusEditor(mode)
	await mimiri().page.keyboard.press('Control+s')
	await waitForSyncToEnd()
}

export const focusEditor = async (mode: EditorMode) => {
	await surface(mode).click()
	if (mode === 'code') {
		await expect(editor.monaco()).toHaveClass(/\bfocused\b/)
	} else {
		await expect(editor.proseMirror()).toHaveClass(/ProseMirror-focused/)
	}
}

export const typeInEditor = async (mode: EditorMode, text: string) => {
	await focusEditor(mode)
	await mimiri().page.keyboard.type(text)
}

export const selectAllInEditor = async (mode: EditorMode) => {
	await focusEditor(mode)
	await mimiri().page.keyboard.press('Control+a')
}

// Select the current line as a text selection. Unlike Ctrl+A (which in
// ProseMirror produces an AllSelection anchored at doc depth), this yields a
// within-paragraph selection, which actions like mark-password require.
export const selectLineInEditor = async (mode: EditorMode) => {
	await focusEditor(mode)
	await mimiri().page.keyboard.press('Home')
	await mimiri().page.keyboard.press('Shift+End')
}

// Normalized visible text of the active editor surface. Monaco renders its
// DOM progressively, so a single read can capture a partial frame — always
// assert on this via expect.poll (or the clickUntil helper below).
export const visibleText = async (mode: EditorMode) => {
	const locator = mode === 'code' ? editor.monacoContainer().locator('.view-lines') : editor.proseMirror()
	const text = await locator.innerText()
	return text.replace(/ /g, ' ').replace(/\s+/g, ' ').trim()
}

// Read the underlying (serialized) note text. Monaco *is* the raw text, so we
// read it there via select-all + copy; when called from wysiwyg mode this
// round-trips through the mode toggle, which doubles as a serializer check.
export const readRawText = async (mode: EditorMode) => {
	await ensureEditorMode('code')
	await focusEditor('code')
	await mimiri().page.keyboard.press('Control+a')
	await mimiri().waitForTimeout(100)
	await mimiri().page.keyboard.press('Control+c')
	const text: string = await mimiri().page.evaluate(() => (globalThis as any).navigator.clipboard.readText())
	// Collapse the select-all so a later action does not replace the content.
	await mimiri().page.keyboard.press('End')
	if (mode === 'wysiwyg') {
		await ensureEditorMode('wysiwyg')
	}
	return text.replace(/\r/g, '')
}

// ToolbarIcon does not set the disabled attribute; it expresses disabled state
// with the text-toolbar-disabled class on the icon and by swallowing clicks.
export const expectToolbarButtonEnabled = async (button: Locator) => {
	await expect(button.locator('.text-toolbar-disabled')).toHaveCount(0)
}

export const expectToolbarButtonDisabled = async (button: Locator) => {
	await expect(button.locator('.text-toolbar-disabled')).not.toHaveCount(0)
}

const toolbarButtonIsDisabled = async (button: Locator) => {
	return (await button.locator('.text-toolbar-disabled').count()) > 0
}

// Click a toolbar button until the condition holds (undo/redo grouping differs
// between the editors, so fixed click counts are not portable). Stops early if
// the button reports disabled.
export const clickUntil = async (button: Locator, condition: () => Promise<boolean>, maxClicks = 30) => {
	for (let i = 0; i < maxClicks; i++) {
		if (await condition()) {
			return
		}
		if (await toolbarButtonIsDisabled(button)) {
			break
		}
		await button.click()
		await mimiri().waitForTimeout(50)
	}
	await expect.poll(async () => await condition(), { timeout: 2000 }).toBe(true)
}
