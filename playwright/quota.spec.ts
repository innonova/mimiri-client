import { expect, test } from '@playwright/test'
import { mimiri, withMimiriContext } from './framework/mimiri-context'
import {
	aboutView,
	deleteNoteDialog,
	editor,
	emptyRecycleBinDialog,
	menu,
	note,
	settingNodes,
	statusBar,
	syncErrorDialog,
	textNoteProperties,
	titleBar,
} from './selectors'
import { createCloudAccount } from './core/actions'
import { createChildNote, createRootNote, createTestTree } from './notes/actions'
import { longRandomLine, quotaSizeTestTree, quotaTestTree } from './notes/data.quotas'

// test.describe.configure({ mode: 'serial' })

test.describe('quotas', () => {
	test('verify max count limit', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await mimiri().setUserTypeCountTest()
			await createTestTree(quotaTestTree)
			await expect(statusBar.container()).not.toBeVisible()

			await settingNodes.controlPanel().click()
			await expect(aboutView.noteCount()).toHaveText('20')
			await expect(aboutView.maxNoteCount()).toHaveText('20')
			await expect(aboutView.unsyncedNoteCount()).toHaveText('0')
			await createRootNote('Quota Exceed Count', 'This note should not be synced due to count limit')
			await expect(statusBar.container()).toBeVisible()
			await expect(statusBar.syncStatusCode()).toHaveValue('count-limit-exceeded')
			await statusBar.container().click()
			await expect(syncErrorDialog.container()).toBeVisible()
			await expect(syncErrorDialog.title()).toHaveText('Note Limit Reached')
			await syncErrorDialog.okButton().click()
			await settingNodes.controlPanel().click()
			await expect(aboutView.noteCount()).toHaveText('21')
			await expect(aboutView.maxNoteCount()).toHaveText('20')
			await expect(aboutView.unsyncedNoteCount()).toHaveText('2')

			await note.item('Quota Exceed Count').click({ button: 'right' })
			await menu.recycle().click()
			await expect(statusBar.container()).toBeVisible()
			await expect(statusBar.syncStatusCode()).toHaveValue('count-limit-exceeded')
			await settingNodes.recycleBin().click({ button: 'right' })
			await menu.emptyRecycleBin().click()
			await expect(emptyRecycleBinDialog.container()).toBeVisible()
			await emptyRecycleBinDialog.okButton().click()
			await settingNodes.controlPanel().click()
			await expect(aboutView.noteCount()).toHaveText('20')
			await expect(aboutView.maxNoteCount()).toHaveText('20')
			await expect(aboutView.unsyncedNoteCount()).toHaveText('0')
			await expect(statusBar.container()).not.toBeVisible()
		})
	})

	test('verify max size limit', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await mimiri().setUserTypeSizeTest()
			await createTestTree(quotaSizeTestTree, { verify: false, typeText: false })
			await expect(statusBar.container()).not.toBeVisible()

			await settingNodes.controlPanel().click()
			await expect(aboutView.usedBytes()).toHaveText('23 kB')

			await note.item('Size Quota Test Root').click({ button: 'right' })
			await menu.duplicate().click()
			await titleBar.edit().click()
			await menu.duplicate().click()

			await expect(statusBar.container()).toBeVisible()
			await expect(statusBar.syncStatusCode()).toHaveValue('total-size-limit-exceeded')
			await statusBar.container().click()
			await expect(syncErrorDialog.container()).toBeVisible()
			await expect(syncErrorDialog.title()).toHaveText('Data Limit Reached')
			await syncErrorDialog.okButton().click()

			await settingNodes.controlPanel().click()
			await expect(aboutView.usedBytes()).toHaveText('52 kB')

			await note.item('Size Quota Test Root').click({ button: 'right', modifiers: ['Shift'] })
			await menu.delete().click()

			await expect(deleteNoteDialog.container()).toBeVisible()
			await deleteNoteDialog.confirmButton().click()
			await settingNodes.controlPanel().click()
			await expect(aboutView.usedBytes()).toHaveText('38 kB')
			await expect(statusBar.container()).not.toBeVisible()
		})
	})

	test('verify size unchanged when moving notes', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await createTestTree(quotaSizeTestTree, { verify: false, typeText: false })
			await expect(statusBar.container()).not.toBeVisible()

			await settingNodes.controlPanel().click()
			const initialSize = Math.floor(+((await aboutView.usedBytes().getAttribute('title')) ?? 0) / 10)
			await expect(initialSize).toBe(2360)
			await expect(aboutView.usedBytes()).toHaveText('23 kB')

			await note.item('Technical Documentation').click({ button: 'right' })
			await menu.cut().click()
			await note.item('Configuration Files').click({ button: 'right' })
			await menu.paste().click()

			await settingNodes.controlPanel().click()

			const afterSize = Math.floor(+((await aboutView.usedBytes().getAttribute('title')) ?? 0) / 10)
			await expect(afterSize).toBe(initialSize!)
			await expect(statusBar.container()).not.toBeVisible()
		})
	})

	test('verify max note size limit', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await mimiri().setUserTypeSizeTest()
			await createTestTree(quotaTestTree)
			await expect(statusBar.container()).not.toBeVisible()
			await note.item('Group B').click()
			await createChildNote('Max Note Size Test', 'This note should not be synced due to size limit')
			await settingNodes.controlPanel().click()
			await expect(statusBar.container()).not.toBeVisible()
			await expect(aboutView.unsyncedNoteCount()).toHaveText('0')
			await expect(aboutView.unsyncedUsedBytes()).toHaveText('0 B')

			await note.item('Max Note Size Test').click({ button: 'right' })
			await menu.properties().click()
			await expect(textNoteProperties.totalSize()).toHaveText(/50\d B/)

			await note.item('Max Note Size Test').click()
			await editor.monaco().click({ timeout: 2000 })
			await expect(editor.monaco()).toHaveClass(/\bfocused\b/, { timeout: 2000 })
			await mimiri().page.keyboard.insertText(longRandomLine())
			await editor.save().click()

			await note.item('Max Note Size Test').click({ button: 'right' })
			await menu.properties().click()
			await expect(textNoteProperties.totalSize()).toHaveText(/2.\d\d kB/)

			await note.item('Max Note Size Test').click()
			await editor.monaco().click({ timeout: 2000 })
			await expect(editor.monaco()).toHaveClass(/\bfocused\b/, { timeout: 2000 })
			for (let i = 0; i < 10; i++) {
				await mimiri().page.keyboard.insertText(longRandomLine())
			}

			await mimiri().pause()
		})
	})
})
