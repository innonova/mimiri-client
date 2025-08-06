import { expect, test } from '@playwright/test'
import { mimiri, mimiriCreate, withMimiriContext } from './framework/mimiri-context'
import {
	aboutView,
	acceptShareDialog,
	deleteNoteDialog,
	editor,
	emptyRecycleBinDialog,
	menu,
	note,
	settingNodes,
	shareDialog,
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

	test('verify count changes appropriately when copying sub tree', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await createTestTree(quotaTestTree)
			await expect(statusBar.container()).not.toBeVisible()

			await settingNodes.controlPanel().click()
			await expect(aboutView.noteCount()).toHaveText('20')

			await note.item('Group A').click({ button: 'right' })
			await menu.copy().click()
			await note.item('Group B').click({ button: 'right' })
			await menu.paste().click()

			await settingNodes.controlPanel().click()
			await expect(aboutView.noteCount()).toHaveText('24')
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

	test('verify max size limit into upgrade', async () => {
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
			await mimiri().setUserTypeFree()
			await note.item('Size Quota Test Root').click()
			await editor.monaco().click({ timeout: 2000 })
			await expect(editor.monaco()).toHaveClass(/\bfocused\b/, { timeout: 2000 })
			await mimiri().page.keyboard.insertText('test')
			await editor.save().click()
			await expect(statusBar.container()).not.toBeVisible()
		})
	})

	test('verify count changes appropriately when accepting share', async () => {
		await withMimiriContext(async () => {
			// Setup first user with shared container
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await createTestTree([
				{
					title: 'Shared Container',
					text: 'This container will be shared to test count changes',
					children: [
						{
							title: 'Shared Note 1',
							text: 'First note in shared container',
						},
						{
							title: 'Shared Note 2',
							text: 'Second note in shared container',
						},
					],
				},
			])

			// Create second user
			await mimiriCreate(true)
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await createTestTree([
				{
					title: 'My Notes',
					text: 'Personal notes container',
				},
			])

			// Check initial count for user 2
			await settingNodes.controlPanel().click()
			await expect(aboutView.noteCount()).toHaveText('5')
			const targetUsername = mimiri().username

			// User 1 shares the container with user 2
			mimiri(0, true)
			await note.item('Shared Container').click({ button: 'right' })
			await menu.share().click()
			await shareDialog.username().fill(targetUsername)
			await shareDialog.okButton().click()
			await expect(shareDialog.code()).toBeVisible()
			const shareCode = (await shareDialog.code().textContent()) ?? ''
			await shareDialog.closeButton().click()

			// User 2 accepts the share
			mimiri(1, true)
			await note.item('My Notes').click({ button: 'right' })
			await menu.receiveShareUnder().click()
			await acceptShareDialog.code().fill(shareCode)
			await acceptShareDialog.okButton().click()
			await expect(acceptShareDialog.container()).not.toBeVisible()

			// Verify count increased for user 2 after accepting share
			await settingNodes.controlPanel().click()
			await expect(aboutView.noteCount()).toHaveText('8')

			await mimiri().pause()
		})
	})

	test('verify count does not change when creating share', async () => {
		await withMimiriContext(async () => {
			// Setup user with notes to share
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await createTestTree([
				{
					title: 'Container to Share',
					text: 'This container will be shared to verify count does not change',
					children: [
						{
							title: 'Note A',
							text: 'First note to be shared',
						},
						{
							title: 'Note B',
							text: 'Second note to be shared',
						},
					],
				},
				{
					title: 'Private Container',
					text: 'This container stays private',
				},
			])

			// Check count before sharing
			await settingNodes.controlPanel().click()
			await expect(aboutView.noteCount()).toHaveText('8')

			// Create second user for sharing target
			await mimiriCreate(true)
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			const targetUsername = mimiri().username

			// User 1 creates share (count should not change)
			mimiri(0, true)
			await note.item('Container to Share').click({ button: 'right' })
			await menu.share().click()
			await shareDialog.username().fill(targetUsername)
			await shareDialog.okButton().click()
			await expect(shareDialog.code()).toBeVisible()
			await shareDialog.closeButton().click()

			// Verify count remains the same after creating share
			await settingNodes.controlPanel().click()
			await expect(aboutView.noteCount()).toHaveText('8')
		})
	})

	test('verify count change when other user adds note to share', async () => {
		await withMimiriContext(async () => {
			// Setup first user with shared container
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await createTestTree([
				{
					title: 'Shared Workspace',
					text: 'Collaborative workspace for testing',
					children: [
						{
							title: 'Initial Note',
							text: 'Note that exists before collaboration',
						},
					],
				},
			])

			// Setup second user
			await mimiriCreate(true)
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await createTestTree([
				{
					title: 'Collaboration Hub',
					text: 'Hub for receiving shared content',
				},
			])
			const targetUsername = mimiri().username

			// User 1 shares workspace with user 2
			mimiri(0, true)
			await note.item('Shared Workspace').click({ button: 'right' })
			await menu.share().click()
			await shareDialog.username().fill(targetUsername)
			await shareDialog.okButton().click()
			await expect(shareDialog.code()).toBeVisible()
			const shareCode = (await shareDialog.code().textContent()) ?? ''
			await shareDialog.closeButton().click()

			// User 2 accepts the share
			mimiri(1, true)
			await note.item('Collaboration Hub').click({ button: 'right' })
			await menu.receiveShareUnder().click()
			await acceptShareDialog.code().fill(shareCode)
			await acceptShareDialog.okButton().click()
			await expect(acceptShareDialog.container()).not.toBeVisible()

			// Check initial counts for both users
			await settingNodes.controlPanel().click()
			await expect(aboutView.noteCount()).toHaveText('7')

			mimiri(0, true)
			await settingNodes.controlPanel().click()
			await expect(aboutView.noteCount()).toHaveText('6')

			// User 2 adds a note to the shared workspace
			mimiri(1, true)
			await note.item('Shared Workspace').click()
			await createChildNote('Added by User 2', 'This note was added by the second user')
			await editor.save().click()

			// Verify count increased for both users
			await settingNodes.controlPanel().click()
			await expect(aboutView.noteCount()).toHaveText('8')

			mimiri(0, true)
			await settingNodes.controlPanel().click()
			await expect(aboutView.noteCount()).toHaveText('7')

			await mimiri().pause()
		})
	})
})
