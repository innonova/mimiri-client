import { expect, test } from '@playwright/test'
import { mimiri, mimiriCreate, withMimiriContext } from './framework/mimiri-context'
import { menu, note, titleBar, editor, shareDialog, acceptShareDialog, deleteNoteDialog } from './selectors'
import { createChildNote, createRootNote, createTestTree, verifyTestTree } from './notes/actions'
import { createCloudAccount } from './core/actions'
import { sharedBaseTree, collaborationHubTree, afterNoteCreation, afterEdit } from './notes/data.shared'

test.describe('shared note live sync tests', () => {
	test('verify live sync between two users - shared note creation', async () => {
		await withMimiriContext(async () => {
			// Setup first user with shared container
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await createTestTree(sharedBaseTree)

			// Setup second user with collaboration hub
			await mimiriCreate(true)
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await createTestTree(collaborationHubTree)
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

			// User 2 accepts the share under Collaboration Hub
			mimiri(1, true)
			await note.item('Collaboration Hub').click({ button: 'right' })
			await menu.receiveShareUnder().click()
			await acceptShareDialog.code().fill(shareCode)
			await acceptShareDialog.okButton().click()
			await expect(acceptShareDialog.container()).not.toBeVisible()

			// Verify shared container appears for user 2
			await expect(note.item('Shared Container')).toBeVisible()
			await note.item('Shared Container').click()
			await note.expand('Shared Container').click()
			await expect(note.item('Sync Marker')).toBeVisible()

			// Now test live sync: user 1 creates a note in shared space while user 2 is watching
			mimiri(0, true)
			await note.item('Shared Container').click()
			await createChildNote('Live Shared Note', 'This is content created live by user 1 in shared space')
			await editor.save().click()

			// User 2 should see the new note appear live
			mimiri(1, true)
			await expect(note.item('Live Shared Note')).toBeVisible()

			// Verify the complete shared tree structure
			await verifyTestTree(afterNoteCreation)
		})
	})

	test('verify live sync between two users - shared note editing', async () => {
		await withMimiriContext(async () => {
			// Setup first user with shared container
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await createTestTree(sharedBaseTree)

			// Setup second user with collaboration hub
			await mimiriCreate(true)
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await createTestTree(collaborationHubTree)
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

			// User 2 accepts the share under Collaboration Hub
			mimiri(1, true)
			await note.item('Collaboration Hub').click({ button: 'right' })
			await menu.receiveShareUnder().click()
			await acceptShareDialog.code().fill(shareCode)
			await acceptShareDialog.okButton().click()
			await expect(acceptShareDialog.container()).not.toBeVisible()

			// Verify shared container appears for user 2
			await expect(note.item('Shared Container')).toBeVisible()
			await note.item('Shared Container').click()
			await note.expand('Shared Container').click()
			await expect(note.item('Sync Marker')).toBeVisible()

			// User 1 creates a note to be edited
			mimiri(0, true)
			await note.item('Shared Container').click()
			await createChildNote('Live Shared Edit Test', 'Original content that will be edited live.')
			await editor.save().click()

			// User 2 waits for the test note to sync over
			mimiri(1, true)
			await expect(note.item('Live Shared Edit Test')).toBeVisible()

			// Now test live sync: user 1 edits the note while user 2 has it open (but not editing)
			mimiri(0, true)
			await note.item('Live Shared Edit Test').click()
			await editor.monaco().click()
			await mimiri().page.keyboard.press('Control+a')
			await mimiri().page.keyboard.type('Content edited live by user 1 in shared space')
			await editor.save().click()

			// User 2 should see the live edit
			mimiri(1, true)
			await note.item('Live Shared Edit Test').click()
			await expect(editor.monaco()).toHaveText('Content edited live by user 1 in shared space')

			// Verify the complete updated shared tree
			await verifyTestTree(afterEdit)
		})
	})

	test('verify live sync between two users - shared note deletion', async () => {
		// This test is skipped because shared note deletion sync appears to have timing issues
		// Similar to the single-user deletion sync test
		await withMimiriContext(async () => {
			// Setup first user with shared container
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await createTestTree(sharedBaseTree)

			// Setup second user with collaboration hub
			await mimiriCreate(true)
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await createTestTree(collaborationHubTree)
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

			// User 2 accepts the share under Collaboration Hub
			mimiri(1, true)
			await note.item('Collaboration Hub').click({ button: 'right' })
			await menu.receiveShareUnder().click()
			await acceptShareDialog.code().fill(shareCode)
			await acceptShareDialog.okButton().click()
			await expect(acceptShareDialog.container()).not.toBeVisible()

			// Verify shared container appears for user 2
			await expect(note.item('Shared Container')).toBeVisible()
			await note.item('Shared Container').click()
			await note.expand('Shared Container').click()
			await expect(note.item('Sync Marker')).toBeVisible()

			// User 1 creates test notes in shared space
			mimiri(0, true)
			await note.item('Shared Container').click()
			await createChildNote('Shared To Be Deleted', 'This note will be deleted during shared testing.')
			await editor.save().click()
			await note.item('Shared Container').click() // Go back to container
			await createChildNote('Shared To Remain', 'This note will remain after shared deletion testing.')
			await editor.save().click()

			// User 2 waits for the notes to sync over
			mimiri(1, true)
			await expect(note.item('Shared To Be Deleted')).toBeVisible()
			await expect(note.item('Shared To Remain')).toBeVisible()

			// Now test live sync: user 1 deletes note while user 2 is watching
			mimiri(0, true)
			await note.item('Shared To Be Deleted').click({ button: 'right' })
			await menu.delete().click()
			await expect(deleteNoteDialog.container()).toBeVisible()
			await expect(deleteNoteDialog.deleteShare()).toBeVisible()

			await deleteNoteDialog.confirmButton().click()

			// User 2 should see the note disappear
			mimiri(1, true)
			await expect(note.item('Shared To Be Deleted')).not.toBeVisible({ timeout: 15000 })

			// Verify the remaining notes are still there
			await expect(note.item('Sync Marker')).toBeVisible()
			await expect(note.item('Shared To Remain')).toBeVisible()
		})
	})
})
