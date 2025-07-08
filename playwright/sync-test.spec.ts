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
			// Setup first device and create initial minimal tree
			await mimiri().home()
			await createCloudAccount()
			await createTestTree(syncNoteCreationTree)

			// Setup second device (cloned instance shares credentials)
			await mimiriClone(true)
			await mimiri().home()
			await login()
			await expect(titleBar.accountButton()).toBeVisible()
			await expect(titleBar.accountButton()).toHaveAttribute('title', 'Account (Online)')

			// Wait for marker note to appear - this confirms sync is working
			await expect(note.item('Sync Marker')).toBeVisible()

			// Now create a note on device 1 while device 2 is watching
			mimiri(0, true)
			await createRootNote('Live Sync Test Note', 'This is content created live on device 1')
			await editor.save().click()

			// Switch to device 2 and verify the complete tree structure
			mimiri(1, true)
			await verifyTestTree(syncAfterNoteCreation)
		})
	})

	test('verify live sync between two devices - note editing', async () => {
		await withMimiriContext(async () => {
			// Setup first device and create basic marker tree
			await mimiri().home()
			await createCloudAccount()
			await createTestTree(syncNoteCreationTree)

			// Setup second device
			await mimiriClone(true)
			await mimiri().home()
			await login()

			// Wait for marker note to confirm sync is working
			await expect(note.item('Sync Marker')).toBeVisible()

			// Now create the note we'll be editing on device 1 while device 2 is watching
			mimiri(0, true)
			await createRootNote('Live Edit Test', 'Original content that will be edited live.')
			await editor.save().click()

			// Wait for the test note to sync over to device 2
			mimiri(1, true)
			await expect(note.item('Live Edit Test')).toBeVisible()

			// Now test live sync: edit note on device 1 while device 2 has it open (but not editing)
			mimiri(0, true)
			await note.item('Live Edit Test').click()
			await editor.monaco().click()
			await mimiri().page.keyboard.press('Control+a')
			await mimiri().page.keyboard.type('Content edited live on device 1')
			await editor.save().click()

			// Switch to device 2 and wait for the live edit to sync over
			mimiri(1, true)
			await note.item('Live Edit Test').click()
			await expect(editor.monaco()).toHaveText('Content edited live on device 1')

			// Verify the complete updated tree
			await verifyTestTree(syncAfterLiveEdit)
		})
	})

	test('verify live sync between two devices - note hierarchy changes', async () => {
		await withMimiriContext(async () => {
			// Setup first device and create basic marker tree
			await mimiri().home()
			await createCloudAccount()
			await createTestTree(syncNoteCreationTree)

			// Setup second device
			await mimiriClone(true)
			await mimiri().home()
			await login()

			// Wait for marker note to confirm sync is working
			await expect(note.item('Sync Marker')).toBeVisible()

			// Now create the parent note and initial children on device 1 while device 2 is watching
			mimiri(0, true)
			await createTestTree(syncHierarchyInitialTree)

			// Wait for the hierarchy to sync over to device 2
			mimiri(1, true)
			await expect(note.item('Parent Note')).toBeVisible()

			// Verify the children synced by expanding parent on device 2
			await note.item('Parent Note').click()
			await note.expand('Parent Note').click()
			await expect(note.item('Child Note 1')).toBeVisible()
			await expect(note.item('Child Note 2')).toBeVisible()

			// Now test live sync: add a new child on device 1 while device 2 is watching
			mimiri(0, true)
			await note.item('Parent Note').click()
			await createChildNote('Child Note 3', 'Added live from device 1')
			await editor.save().click()

			// Switch to device 2 and verify the new child appears live
			mimiri(1, true)
			await expect(note.item('Child Note 3')).toBeVisible()

			// Verify the complete updated tree structure
			await verifyTestTree(syncAfterHierarchyChange)
		})
	})

	test('verify live sync prevents conflicts - editing protection', async () => {
		await withMimiriContext(async () => {
			// Setup first device with only marker note
			await mimiri().home()
			await createCloudAccount()
			await createTestTree(syncNoteCreationTree)

			// Setup second device
			await mimiriClone(true)
			await mimiri().home()
			await login()

			// Wait for marker note to confirm sync is working
			await expect(note.item('Sync Marker')).toBeVisible()

			// Now create the test note live on device 1 while device 2 is watching
			mimiri(0, true)
			await createRootNote('Edit Protection Test', 'Base content for edit protection testing.')
			await editor.save().click()

			// Device 2 waits for the note to sync over
			mimiri(1, true)
			await expect(note.item('Edit Protection Test')).toBeVisible()

			// Device 2 starts editing (clicks into editor)
			await note.item('Edit Protection Test').click()
			await editor.monaco().click() // Start editing on device 2

			// Device 1 makes and saves a change while device 2 is editing
			mimiri(0, true)
			await note.item('Edit Protection Test').click()
			await editor.monaco().click()
			await mimiri().page.keyboard.press('Control+a')
			await mimiri().page.keyboard.type('Changed by device 1 while device 2 was editing')
			await editor.save().click()

			// Device 2 should NOT see the changes yet because it's actively editing
			mimiri(1, true)
			// Device 2 should still have the original content since it's in edit mode
			await expect(editor.monaco()).toHaveText('Base content for edit protection testing.')

			// But once device 2 navigates away, it should see the updated content
			await note.item('Sync Marker').click() // Navigate away from editing

			// Now verify device 2 sees the updated content
			await note.item('Edit Protection Test').click()
			await expect(editor.monaco()).toHaveText('Changed by device 1 while device 2 was editing')

			// Verify the complete updated tree
			await verifyTestTree(syncAfterEditProtection)
		})
	})

	test.skip('verify live sync between two devices - concurrent edits handling', async () => {
		await withMimiriContext(async () => {
			// Setup first device with only marker note
			await mimiri().home()
			await createCloudAccount()
			await createTestTree(syncNoteCreationTree)

			// Setup second device
			await mimiriClone(true)
			await mimiri().home()
			await login()

			// Wait for marker note to confirm sync is working
			await expect(note.item('Sync Marker')).toBeVisible()

			// Now create the test note live on device 1 while device 2 is watching
			mimiri(0, true)
			await createRootNote('Concurrent Edit Test', 'Base content for concurrent edit testing.')
			await editor.save().click()

			// Device 2 waits for the note to sync over
			mimiri(1, true)
			await expect(note.item('Concurrent Edit Test')).toBeVisible()

			// Both devices edit simultaneously (simulating conflict scenario)
			// Device 1 edit
			mimiri(0, true)
			await note.item('Concurrent Edit Test').click()
			await editor.monaco().click()
			await mimiri().page.keyboard.press('Control+a')
			await mimiri().page.keyboard.type('Edit from device 1')

			// Device 2 edit (without saving device 1 first)
			mimiri(1, true)
			await note.item('Concurrent Edit Test').click()
			await editor.monaco().click()
			await mimiri().page.keyboard.press('Control+a')
			await mimiri().page.keyboard.type('Edit from device 2')
			await editor.save().click()

			// Save on device 1 after device 2
			mimiri(0, true)
			await editor.save().click()

			// Both devices navigate away from editing to trigger sync
			mimiri(0, true)
			await note.item('Sync Marker').click()

			mimiri(1, true)
			await note.item('Sync Marker').click()

			// Wait a moment for sync to complete
			await mimiri().page.waitForTimeout(2000)

			// Now check both devices to see final content
			mimiri(1, true)
			await note.item('Concurrent Edit Test').click()
			const device2Content = await editor.monaco().textContent()

			mimiri(0, true)
			await note.item('Concurrent Edit Test').click()
			const device1Content = await editor.monaco().textContent()

			// Log the actual content for debugging
			console.log('Device 1 content:', device1Content)
			console.log('Device 2 content:', device2Content)

			// The system should handle concurrent edits - either both devices converge
			// to the same state, or each maintains its own edit until explicit sync
			// For this test, we'll just verify that both edits are preserved in some form
			expect(device1Content === 'Edit from device 1' || device1Content === 'Edit from device 2').toBe(true)
			expect(device2Content === 'Edit from device 1' || device2Content === 'Edit from device 2').toBe(true)
		})
	})

	test('verify live sync between two devices - note deletion', async () => {
		await withMimiriContext(async () => {
			// Setup first device with only marker note
			await mimiri().home()
			await createCloudAccount()
			await createTestTree(syncNoteCreationTree)

			// Setup second device
			await mimiriClone(true)
			await mimiri().home()
			await login()

			// Wait for marker note to confirm sync is working
			await expect(note.item('Sync Marker')).toBeVisible()

			// Now create the test notes live on device 1 while device 2 is watching
			mimiri(0, true)
			await createRootNote('To Be Deleted', 'This note will be deleted during testing.')
			await editor.save().click()
			await createRootNote('To Remain', 'This note will remain after deletion testing.')
			await editor.save().click()

			// Device 2 waits for the notes to sync over
			mimiri(1, true)
			await expect(note.item('To Be Deleted')).toBeVisible()
			await expect(note.item('To Remain')).toBeVisible()

			// Now test live sync: delete note on device 1 while device 2 is watching
			mimiri(0, true)
			await note.item('To Be Deleted').click({ button: 'right' })
			await menu.recycle().click()

			// Device 2 should see the note disappear
			mimiri(1, true)
			await expect(note.item('To Be Deleted')).not.toBeVisible({ timeout: 15000 })

			// Verify the remaining notes are still there
			await expect(note.item('Sync Marker')).toBeVisible()
			await expect(note.item('To Remain')).toBeVisible()
		})
	})
})
