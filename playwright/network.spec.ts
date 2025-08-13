import { expect, test } from '@playwright/test'
import { mimiri, withMimiriContext } from './framework/mimiri-context'
import { aboutView, menu, settingNodes, statusBar, syncErrorDialog, titleBar } from './selectors'
import { createCloudAccount, login, logout } from './core/actions'
import { createRootNote } from './notes/actions'

// test.describe.configure({ mode: 'serial' })

test.describe('network', () => {
	test('verify login when no network', async () => {
		await withMimiriContext(async () => {
			let networkError = false
			await mimiri().page.route('**/api/**', route => {
				if (networkError) {
					void route.abort('failed')
				} else {
					void route.continue()
				}
			})

			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await logout()
			await mimiri().reload()
			networkError = true
			await login()
			await expect(titleBar.accountButton()).toBeVisible()
			await expect(titleBar.accountButton()).toHaveAttribute('title', 'Account (Offline)')
			// await mimiri().pause()
		})
	})

	test('verify offline/online mechanics', async () => {
		await withMimiriContext(async () => {
			let networkError = false
			let apiCallCount = 0
			await mimiri().page.route('**/api/**', route => {
				apiCallCount++
				if (networkError) {
					void route.abort('failed')
				} else {
					void route.continue()
				}
			})

			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await logout()
			await mimiri().reload()
			networkError = true
			await login()
			await expect(titleBar.accountButton()).toBeVisible()
			await expect(titleBar.accountButton()).toHaveAttribute('title', 'Account (Offline)')
			const apiCountBefore = apiCallCount
			await titleBar.accountButton().click()
			await menu.workOffline().click()
			await expect(titleBar.accountButton()).toHaveAttribute('title', 'Account (Connecting)')
			await mimiri().waitForTimeout(1000)
			await expect(titleBar.accountButton()).toHaveAttribute('title', 'Account (Connecting)')
			expect(apiCountBefore).toBeLessThan(apiCallCount)
			networkError = false
			await expect(titleBar.accountButton()).toHaveAttribute('title', 'Account (Online)')
			await titleBar.accountButton().click()
			await menu.workOffline().click()
			await expect(titleBar.accountButton()).toHaveAttribute('title', 'Account (Offline)')
		})
	})

	test('verify sync handling of connection loss', async () => {
		await withMimiriContext(async () => {
			let networkError = false
			await mimiri().page.route('**/api/**', route => {
				if (networkError) {
					void route.abort('failed')
				} else {
					void route.continue()
				}
			})
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await expect(titleBar.accountButton()).toHaveAttribute('title', 'Account (Online)')
			await createRootNote('Test root', 'This is a test root note')
			await settingNodes.controlPanel().click()
			await expect(statusBar.container()).not.toBeVisible()
			await expect(aboutView.unsyncedNoteCount()).toHaveText('0')
			networkError = true
			await createRootNote('Test root 2', 'This is another test root note')
			await expect(statusBar.container()).toBeVisible()
			await expect(statusBar.syncStatusCode()).toHaveValue('synchronization-error')
			await statusBar.container().click()
			await expect(syncErrorDialog.container()).toBeVisible()
			await expect(syncErrorDialog.title()).toHaveText('Synchronization Error')
			await syncErrorDialog.okButton().click()
			await settingNodes.controlPanel().click()
			await expect(aboutView.unsyncedNoteCount()).toHaveText('2')
			networkError = false
			await expect(statusBar.container()).not.toBeVisible()
			await settingNodes.controlPanel().click()
			await expect(statusBar.container()).not.toBeVisible()
			await expect(aboutView.unsyncedNoteCount()).toHaveText('0')

			// await mimiri().pause()
		})
	})
})
