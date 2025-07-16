import { expect, test } from '@playwright/test'
import { mimiri, mimiriClone, withMimiriContext } from './framework/mimiri-context'
import { menu, note, titleBar, editor } from './selectors'
import { createChildNote, createRootNote, createTestTree, verifyTestTree } from './notes/actions'
import { createCloudAccount, login } from './core/actions'
import {
	syncNoteCreationTree,
	syncHierarchyInitialTree,
	syncAfterNoteCreation,
	syncAfterLiveEdit,
	syncAfterHierarchyChange,
	syncAfterEditProtection,
} from './notes/data.sync'

// test.describe.configure({ mode: 'serial' })

test.describe('sync tests', () => {
	test('verify live sync between two devices - note creation', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createCloudAccount()
			await createTestTree(syncNoteCreationTree)

			await mimiriClone(true)
			await mimiri().home()
			await login()
			await expect(titleBar.accountButton()).toBeVisible()
			await expect(titleBar.accountButton()).toHaveAttribute('title', 'Account (Online)')

			await expect(note.item('Sync Marker')).toBeVisible()

			mimiri(0, true)
			await createRootNote('Live Sync Test Note', 'This is content created live on device 1')
			await editor.save().click()

			mimiri(1, true)
			await verifyTestTree(syncAfterNoteCreation)
		})
	})

	test('verify live sync between two devices - note editing', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createCloudAccount()
			await createTestTree(syncNoteCreationTree)

			await mimiriClone(true)
			await mimiri().home()
			await login()

			await expect(note.item('Sync Marker')).toBeVisible()

			mimiri(0, true)
			await createRootNote('Live Edit Test', 'Original content that will be edited live.')
			await editor.save().click()

			mimiri(1, true)
			await expect(note.item('Live Edit Test')).toBeVisible()

			mimiri(0, true)
			await note.item('Live Edit Test').click()
			await editor.monaco().click()
			await mimiri().page.keyboard.press('Control+a')
			await mimiri().page.keyboard.type('Content edited live on device 1')
			await editor.save().click()

			mimiri(1, true)
			await note.item('Live Edit Test').click()
			await expect(editor.monaco()).toHaveText('Content edited live on device 1')

			await verifyTestTree(syncAfterLiveEdit)
		})
	})

	test('verify live sync between two devices - note hierarchy changes', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createCloudAccount()
			await createTestTree(syncNoteCreationTree)

			await mimiriClone(true)
			await mimiri().home()
			await login()

			await expect(note.item('Sync Marker')).toBeVisible()

			mimiri(0, true)
			await createTestTree(syncHierarchyInitialTree)

			mimiri(1, true)
			await expect(note.item('Parent Note')).toBeVisible()

			await note.item('Parent Note').click()
			await note.expand('Parent Note').click()
			await expect(note.item('Child Note 1')).toBeVisible()
			await expect(note.item('Child Note 2')).toBeVisible()

			mimiri(0, true)
			await note.item('Parent Note').click()
			await createChildNote('Child Note 3', 'Added live from device 1')
			await editor.save().click()

			mimiri(1, true)
			await expect(note.item('Child Note 3')).toBeVisible()

			await verifyTestTree(syncAfterHierarchyChange)
		})
	})

	test('verify live sync prevents conflicts - editing protection', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createCloudAccount()
			await createTestTree(syncNoteCreationTree)

			await mimiriClone(true)
			await mimiri().home()
			await login()

			await expect(note.item('Sync Marker')).toBeVisible()

			mimiri(0, true)
			await createRootNote('Edit Protection Test', 'Base content for edit protection testing.')
			await editor.save().click()

			mimiri(1, true)
			await expect(note.item('Edit Protection Test')).toBeVisible()

			await note.item('Edit Protection Test').click()
			await editor.monaco().click() // Start editing on device 2

			mimiri(0, true)
			await note.item('Edit Protection Test').click()
			await editor.monaco().click()
			await mimiri().page.keyboard.press('Control+a')
			await mimiri().page.keyboard.type('Changed by device 1 while device 2 was editing')
			await editor.save().click()

			mimiri(1, true)
			await expect(editor.monaco()).toHaveText('Base content for edit protection testing.')

			await note.item('Sync Marker').click()

			await note.item('Edit Protection Test').click()
			await expect(editor.monaco()).toHaveText('Changed by device 1 while device 2 was editing')

			await verifyTestTree(syncAfterEditProtection)
		})
	})

	test.skip('verify live sync between two devices - concurrent edits handling', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createCloudAccount()
			await createTestTree(syncNoteCreationTree)

			await mimiriClone(true)
			await mimiri().home()
			await login()

			await expect(note.item('Sync Marker')).toBeVisible()

			mimiri(0, true)
			await createRootNote('Concurrent Edit Test', 'Base content for concurrent edit testing.')
			await editor.save().click()

			mimiri(1, true)
			await expect(note.item('Concurrent Edit Test')).toBeVisible()

			mimiri(0, true)
			await note.item('Concurrent Edit Test').click()
			await editor.monaco().click()
			await mimiri().page.keyboard.press('Control+a')
			await mimiri().page.keyboard.type('Edit from device 1')

			mimiri(1, true)
			await note.item('Concurrent Edit Test').click()
			await editor.monaco().click()
			await mimiri().page.keyboard.press('Control+a')
			await mimiri().page.keyboard.type('Edit from device 2')
			await editor.save().click()

			mimiri(0, true)
			await editor.save().click()

			mimiri(0, true)
			await note.item('Sync Marker').click()

			mimiri(1, true)
			await note.item('Sync Marker').click()

			await mimiri().page.waitForTimeout(2000)

			mimiri(1, true)
			await note.item('Concurrent Edit Test').click()
			const device2Content = await editor.monaco().textContent()

			mimiri(0, true)
			await note.item('Concurrent Edit Test').click()
			const device1Content = await editor.monaco().textContent()

			console.log('Device 1 content:', device1Content)
			console.log('Device 2 content:', device2Content)

			expect(device1Content === 'Edit from device 1' || device1Content === 'Edit from device 2').toBe(true)
			expect(device2Content === 'Edit from device 1' || device2Content === 'Edit from device 2').toBe(true)
		})
	})

	test('verify live sync between two devices - note deletion', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createCloudAccount()
			await createTestTree(syncNoteCreationTree)

			await mimiriClone(true)
			await mimiri().home()
			await login()

			await expect(note.item('Sync Marker')).toBeVisible()

			mimiri(0, true)
			await createRootNote('To Be Deleted', 'This note will be deleted during testing.')
			await editor.save().click()
			await createRootNote('To Remain', 'This note will remain after deletion testing.')
			await editor.save().click()

			mimiri(1, true)
			await expect(note.item('To Be Deleted')).toBeVisible()
			await expect(note.item('To Remain')).toBeVisible()

			mimiri(0, true)
			await note.item('To Be Deleted').click({ button: 'right' })
			await menu.recycle().click()

			mimiri(1, true)
			await expect(note.item('To Be Deleted')).not.toBeVisible({ timeout: 15000 })

			await expect(note.item('Sync Marker')).toBeVisible()
			await expect(note.item('To Remain')).toBeVisible()
		})
	})
})
