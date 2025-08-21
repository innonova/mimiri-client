import { expect, test } from '@playwright/test'
import { mimiri, withMimiriContext } from './framework/mimiri-context'
import { createCloudAccount, createLocalAccount, enterPin, login, logout, setPin } from './core/actions'
import { lockScreen, loginCtrl, settingNodes, titleBar } from './selectors'

test.describe('PIN', () => {
	test('basic PIN behavior (local account)', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createLocalAccount()
			await setPin('1234')

			await mimiri().setLockTimeout(1000)
			await mimiri().applicationHiding()
			await mimiri().waitForTimeout(1500)
			await mimiri().applicationShowing()

			await enterPin('1234')
		})
	})

	test('basic PIN behavior (cloud account)', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await setPin('1234')

			await mimiri().setLockTimeout(1000)
			await mimiri().applicationHiding()
			await mimiri().waitForTimeout(1500)
			await mimiri().applicationShowing()

			await enterPin('1234')
		})
	})

	test('basic PIN behavior (no account)', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			if (await settingNodes.controlPanelClosed().isVisible()) {
				await settingNodes.controlPanelClosed().click()
			}
			await settingNodes.settingGroup().dblclick()
			await expect(settingNodes.pin()).not.toBeVisible()
		})
	})

	test('incorrect pin', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createLocalAccount()
			await setPin('1234')

			await mimiri().setLockTimeout(1000)
			await mimiri().applicationHiding()
			await mimiri().waitForTimeout(1500)
			await mimiri().applicationShowing()

			await expect(lockScreen.container()).toBeVisible()
			await mimiri().page.keyboard.type('4567')

			await expect(loginCtrl.container()).toBeVisible()
		})
	})

	test('multiple accounts', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()

			const user1 = mimiri().username
			const user2 = mimiri().username + '_b'

			await createLocalAccount()
			await setPin('1234')

			await mimiri().setLockTimeout(1000)
			await mimiri().applicationHiding()
			await mimiri().waitForTimeout(1500)
			await mimiri().applicationShowing()

			await enterPin('1234')

			await logout()

			await expect(loginCtrl.container()).toBeVisible()
			await loginCtrl.cancelButton().click()

			mimiri().setUsername(user2)

			await createLocalAccount()

			await mimiri().setLockTimeout(1000)
			await mimiri().applicationHiding()
			await mimiri().waitForTimeout(1500)
			await mimiri().applicationShowing()

			await setPin('4567')

			await logout()
			mimiri().setUsername(user1)
			await login()

			await mimiri().setLockTimeout(1000)
			await mimiri().applicationHiding()
			await mimiri().waitForTimeout(1500)
			await mimiri().applicationShowing()

			await enterPin('1234')
		})
	})
})
