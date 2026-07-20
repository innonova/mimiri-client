import { expect, test } from '@playwright/test'
import { mimiri, withMimiriContext } from './framework/mimiri-context'
import { deleteHistoryDialog, editor, editorHistory, menu, note, textNoteProperties, titleBar } from './selectors'
import { createRootNote, replaceTextInEditor } from './notes/actions'
import { createCloudAccount, saveNote } from './core/actions'

// Note history: every save appends a history entry; the 10 newest live in the
// 'active' list and older entries overflow into archives that are fetched via
// 'Read More Entries' (see MimerNote.addHistoryEntry). Read-only viewing of a
// version is additionally covered in editor.spec.ts (find in history view).

const NOTE = 'History Note'

const addVersion = async (text: string) => {
	await replaceTextInEditor(text)
	await saveNote()
}

const setup = async (versions: string[]) => {
	await mimiri().home()
	await expect(titleBar.accountButton()).toBeVisible()
	await createCloudAccount()
	await createRootNote(NOTE, versions[0])
	for (const text of versions.slice(1)) {
		await addVersion(text)
	}
}

test.describe('note history', () => {
	test('lists versions newest first with correct content', async () => {
		await withMimiriContext(async () => {
			await setup(['version one', 'version two', 'version three'])

			await editor.history().click()
			await expect(editorHistory.container()).toBeVisible()

			await editorHistory.item(0).click()
			await expect(editor.monaco()).toHaveText('version three')
			await editorHistory.item(1).click()
			await expect(editor.monaco()).toHaveText('version two')
			await editorHistory.item(2).click()
			await expect(editor.monaco()).toHaveText('version one')
		})
	})

	test('keyboard navigation moves through versions', async () => {
		await withMimiriContext(async () => {
			await setup(['version one', 'version two', 'version three'])

			await editor.history().click()
			await editorHistory.item(0).click()
			await expect(editorHistory.item(0)).toHaveClass(/bg-item-selected/)

			await editorHistory.scrollContainer().press('ArrowDown')
			await expect(editorHistory.item(1)).toHaveClass(/bg-item-selected/)
			await expect(editor.monaco()).toHaveText('version two')

			await editorHistory.scrollContainer().press('ArrowDown')
			await expect(editorHistory.item(2)).toHaveClass(/bg-item-selected/)
			await expect(editor.monaco()).toHaveText('version one')

			await editorHistory.scrollContainer().press('ArrowUp')
			await expect(editorHistory.item(1)).toHaveClass(/bg-item-selected/)
			await expect(editor.monaco()).toHaveText('version two')
		})
	})

	test('read more entries loads archived versions', async () => {
		await withMimiriContext(async () => {
			// 12 saves: 10 stay in the active list, the 2 oldest overflow into
			// the hot archive behind 'Read More Entries'
			await setup(Array.from({ length: 12 }, (_, i) => `version ${i + 1}`))

			await editor.history().click()
			await expect(editorHistory.container()).toBeVisible()
			await expect(editorHistory.item(9)).toBeVisible()
			await expect(editorHistory.item(10)).not.toBeVisible()
			await expect(editorHistory.moreButton()).toBeEnabled()

			await editorHistory.moreButton().click()
			await expect(editorHistory.item(11)).toBeVisible()
			await editorHistory.item(11).click()
			await expect(editor.monaco()).toHaveText('version 1')
			await expect(editorHistory.moreButton()).toBeDisabled()
		})
	})

	test('delete old history keeps the newest versions', async () => {
		await withMimiriContext(async () => {
			await setup(Array.from({ length: 12 }, (_, i) => `version ${i + 1}`))

			await note.item(NOTE).click({ button: 'right' })
			await menu.properties().click()
			await expect(textNoteProperties.container()).toBeVisible()
			await expect(textNoteProperties.deleteOldHistory()).toBeVisible()

			await textNoteProperties.deleteOldHistory().click()
			await expect(deleteHistoryDialog.container()).toBeVisible()
			await deleteHistoryDialog.confirmButton().click()
			await expect(deleteHistoryDialog.container()).not.toBeVisible()

			// After a reload only the 10 active versions remain, nothing archived
			await mimiri().reload()
			await note.item(NOTE).click()
			await editor.history().click()
			await expect(editorHistory.container()).toBeVisible()
			await expect(editorHistory.item(9)).toBeVisible()
			await expect(editorHistory.item(10)).not.toBeVisible()
			await expect(editorHistory.moreButton()).toBeDisabled()
			await editorHistory.item(9).click()
			await expect(editor.monaco()).toHaveText('version 3')
		})
	})

	test('delete all history removes every version', async () => {
		await withMimiriContext(async () => {
			await setup(['version one', 'version two', 'version three'])

			await note.item(NOTE).click({ button: 'right' })
			await menu.properties().click()
			await expect(textNoteProperties.container()).toBeVisible()
			await expect(textNoteProperties.deleteAllHistory()).toBeVisible()
			await expect(textNoteProperties.deleteOldHistory()).not.toBeVisible()

			await textNoteProperties.deleteAllHistory().click()
			await expect(deleteHistoryDialog.container()).toBeVisible()
			await deleteHistoryDialog.confirmButton().click()
			await expect(deleteHistoryDialog.container()).not.toBeVisible()

			await mimiri().reload()
			await note.item(NOTE).click()
			// Note content is untouched, only the history is gone
			await expect(editor.monaco()).toHaveText('version three')
			await editor.history().click()
			await expect(editorHistory.container()).toBeVisible()
			await expect(editorHistory.item(0)).not.toBeVisible()
		})
	})

	test('cancel in the delete dialog keeps the history', async () => {
		await withMimiriContext(async () => {
			await setup(['version one', 'version two'])

			await note.item(NOTE).click({ button: 'right' })
			await menu.properties().click()
			await textNoteProperties.deleteAllHistory().click()
			await expect(deleteHistoryDialog.container()).toBeVisible()
			await deleteHistoryDialog.cancelButton().click()
			await expect(deleteHistoryDialog.container()).not.toBeVisible()

			await note.item(NOTE).click()
			await editor.history().click()
			await expect(editorHistory.item(1)).toBeVisible()
			await editorHistory.item(1).click()
			await expect(editor.monaco()).toHaveText('version one')
		})
	})
})
