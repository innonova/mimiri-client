import { expect, test } from '@playwright/test'
import { mimiri, withMimiriContext } from './framework/mimiri-context'
import { note, titleBar } from './selectors'
import { createTestTree } from './notes/actions'
import { miniTestTree } from './notes/data'
import { createCloudAccount, createLocalAccount, goOffline, waitForSyncToEnd } from './core/actions'

// Basic drag & drop move coverage. Note: moving while offline is currently
// permitted by design, accepting the (rare) risk that concurrent moves on two
// devices diverge the tree — blocking offline moves was tried and rolled back
// because the UX cost outweighed the edge case. A proper conflict-resolution
// fix is planned; when it lands, extend these tests with the conflict scenario.
test.describe('drag and drop', () => {
	const expectMoved = async () => {
		await expect(note.item('Single Data Item', note.container('Data Container B'))).toBeVisible()
	}

	test('drag move works while online (cloud)', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await createTestTree(miniTestTree)
			await note.item('Single Data Item').dragTo(note.item('Data Container B'))
			await waitForSyncToEnd()
			await expectMoved()
		})
	})

	test('drag move works while offline (cloud, by design)', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await createTestTree(miniTestTree)
			await goOffline()
			await note.item('Single Data Item').dragTo(note.item('Data Container B'))
			await expectMoved()
		})
	})

	test('drag move works for local accounts', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createLocalAccount()
			await createTestTree(miniTestTree)
			await note.item('Single Data Item').dragTo(note.item('Data Container B'))
			await expectMoved()
		})
	})

	test('system notes cannot be dragged', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await createTestTree(miniTestTree)
			await note.item('System').dragTo(note.item('Data Container B'))
			await mimiri().waitForTimeout(500)
			await expect(note.item('System', note.container('Data Container B'))).not.toBeVisible()
			await expect(note.item('System')).toBeVisible()
		})
	})
})
