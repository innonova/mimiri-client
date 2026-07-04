import { expect, test } from '@playwright/test'
import { mimiri, withMimiriContext } from './framework/mimiri-context'
import { editor, menu, note, textNoteProperties, titleBar } from './selectors'
import { createTestTree, createRootNote } from './notes/actions'
import { ensureEditorMode } from './editor/mode'
import type { StandardTreeNode } from './notes/data'

const pathTree: StandardTreeNode[] = [
	{
		title: 'Parent Note',
		text: 'parent content',
		children: [{ title: 'Child Note', text: 'child content' }],
	},
]

test.describe('note tree extras', () => {
	test('copy path puts the full note path on the clipboard', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createTestTree(pathTree)

			await note.item('Child Note').click({ button: 'right' })
			await menu.copyPath().click()
			const clipboard = await mimiri().page.evaluate(() => (globalThis as any).navigator.clipboard.readText())
			expect(clipboard).toBe('/Parent Note/Child Note')
		})
	})

	test('duplicate via context menu creates a sibling copy with same content', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createRootNote('Original', 'original content here')

			await note.item('Original').click({ button: 'right' })
			await menu.duplicate().click()
			await expect(note.items('Original')).toHaveCount(2)

			await note.items('Original').nth(1).locator('div').nth(0).click()
			await ensureEditorMode('code')
			await expect(editor.monaco()).toHaveText('original content here')
		})
	})

	test('properties page shows sizes, dates and key', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createRootNote('Props Note', 'some sizeable content for the properties page')

			await note.item('Props Note').click({ button: 'right' })
			await menu.properties().click()
			await expect(textNoteProperties.container()).toBeVisible()

			// Sizes are formatted byte values and non-zero for a note with content
			await expect(textNoteProperties.dataSize()).toHaveText(/[1-9]\d*(\.\d+)?\s*\S*B/)
			await expect(textNoteProperties.totalSize()).toHaveText(/[1-9]\d*(\.\d+)?\s*\S*B/)
			// Created / modified are formatted timestamps
			await expect(textNoteProperties.created()).toHaveText(/\d{4}/)
			await expect(textNoteProperties.updated()).toHaveText(/\d{4}/)
			// The encryption key has a friendly name
			await expect(textNoteProperties.key()).toHaveText(/\S+/)
		})
	})
})
