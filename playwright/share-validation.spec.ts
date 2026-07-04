import { expect, test } from '@playwright/test'
import { mimiri, withMimiriContext } from './framework/mimiri-context'
import { menu, note, shareDialog, titleBar } from './selectors'
import { createRootNote } from './notes/actions'
import { createCloudAccount } from './core/actions'

test.describe('share dialog validation', () => {
	test('reports empty username, share-with-self and unknown user', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await createRootNote('Share Me')

			await note.item('Share Me').click({ button: 'right' })
			await menu.share().click()
			await expect(shareDialog.container()).toBeVisible()

			// Empty username
			await shareDialog.okButton().click()
			await expect(shareDialog.errorInvalidUsername()).toBeVisible()

			// Sharing with yourself
			await shareDialog.username().fill(mimiri().username)
			await shareDialog.okButton().click()
			await expect(shareDialog.errorShareWithSelf()).toBeVisible()

			// Unknown recipient — the server lookup fails
			await shareDialog.username().fill(`no_such_user_${Date.now()}`)
			await shareDialog.okButton().click()
			await expect(shareDialog.errorFailed()).toBeVisible()

			await shareDialog.cancelButton().click()
			await expect(shareDialog.container()).not.toBeVisible()
		})
	})
})
