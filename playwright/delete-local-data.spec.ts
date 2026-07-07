import { expect, test } from '@playwright/test'
import { mimiri, withMimiriContext } from './framework/mimiri-context'
import { clearLocalDataDialog, loginCtrl, menu, note, settingNodes, titleBar } from './selectors'
import { createCloudAccount, login, waitForAppIdle } from './core/actions'
import { createRootNote } from './notes/actions'

// Logging out of a cloud account on web offers to also remove the locally
// cached (encrypted) data. These tests assert the dialog's actual semantics,
// not just the click-through: 'Just log out' keeps the local cache (offline
// login still works), 'Remove data' deletes it (offline login is no longer
// possible; the server copy is untouched).

const setupAccountWithNote = async () => {
	await mimiri().home()
	await expect(titleBar.accountButton()).toBeVisible()
	await createCloudAccount()
	await createRootNote('Keep Me', 'local data test content')
	await waitForAppIdle()
}

const openLogoutDialog = async () => {
	await titleBar.accountButton().click()
	await menu.logout().click()
	await expect(clearLocalDataDialog.container()).toBeVisible()
}

test.describe('delete local data on logout', () => {
	test('escape cancels the dialog and keeps the session', async () => {
		await withMimiriContext(async () => {
			await setupAccountWithNote()
			await openLogoutDialog()
			await mimiri().page.keyboard.press('Escape')
			await expect(clearLocalDataDialog.container()).not.toBeVisible()
			// Still logged in, nothing lost
			await expect(loginCtrl.container()).not.toBeVisible()
			await expect(titleBar.accountButton()).toHaveAttribute('title', 'Account (Online)')
			await expect(note.item('Keep Me')).toBeVisible()
		})
	})

	test('just log out keeps the local cache (offline login works)', async () => {
		await withMimiriContext(async () => {
			let networkError = false
			await mimiri().page.route('**/api/**', route => {
				if (networkError) {
					void route.abort('failed')
				} else {
					void route.continue()
				}
			})
			await setupAccountWithNote()
			await openLogoutDialog()
			await clearLocalDataDialog.logoutButton().click()
			await expect(loginCtrl.container()).toBeVisible()
			// The local cache must carry the account through an offline login
			networkError = true
			await login()
			await expect(titleBar.accountButton()).toHaveAttribute('title', 'Account (Offline)')
			await expect(note.item('Keep Me')).toBeVisible()
		})
	})

	test('remove data deletes the local cache but not the server copy', async () => {
		await withMimiriContext(async () => {
			await setupAccountWithNote()
			await openLogoutDialog()
			await clearLocalDataDialog.clearButton().click()
			// Unlike 'Just log out' (which keeps the account cached and prompts
			// for login), removing the data resets the app to a pristine
			// account-less state: no login prompt, no trace of the account
			await expect(settingNodes.createAccount()).toBeVisible()
			await expect(loginCtrl.container()).not.toBeVisible()
			await expect(note.item('Keep Me')).not.toBeVisible()
			// The server copy is untouched: logging back in restores the note
			await login()
			await expect(titleBar.accountButton()).toHaveAttribute('title', 'Account (Online)')
			await expect(note.item('Keep Me')).toBeVisible()
		})
	})
})
