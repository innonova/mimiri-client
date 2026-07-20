import { expect, test } from '@playwright/test'
import { mimiri, withMimiriContext } from './framework/mimiri-context'
import { createCloudAccount, createLocalAccount, enterPin, login, logout, setPin } from './core/actions'
import { lockScreen, loginCtrl, passwordDialog, pinCodeView, settingNodes, titleBar } from './selectors'

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

	test('change existing PIN', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createLocalAccount()
			await setPin('1234')

			// The PIN page pre-fills the existing PIN; clear it before typing the new one
			await settingNodes.pin().click()
			await expect(pinCodeView.container()).toBeVisible()
			for (let i = 0; i < 4; i++) {
				await mimiri().page.keyboard.press('Backspace')
			}
			await mimiri().page.keyboard.type('9876')
			await pinCodeView.save().click()
			await expect(passwordDialog.container()).toBeVisible()
			await passwordDialog.password().fill(mimiri().password)
			await passwordDialog.okButton().click()
			await expect(passwordDialog.container()).not.toBeVisible()

			await mimiri().setLockTimeout(1000)
			await mimiri().applicationHiding()
			await mimiri().waitForTimeout(1500)
			await mimiri().applicationShowing()

			await enterPin('9876')
		})
	})

	test('clear PIN disables the lock screen', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createLocalAccount()
			await setPin('1234')

			await settingNodes.pin().click()
			await expect(pinCodeView.container()).toBeVisible()
			await expect(pinCodeView.clear()).toBeEnabled()
			await pinCodeView.clear().click()
			await expect(passwordDialog.container()).toBeVisible()
			await passwordDialog.password().fill(mimiri().password)
			await passwordDialog.okButton().click()
			await expect(passwordDialog.container()).not.toBeVisible()
			await expect(pinCodeView.clear()).toBeDisabled()

			// Hiding and showing the app no longer locks it
			await mimiri().setLockTimeout(1000)
			await mimiri().applicationHiding()
			await mimiri().waitForTimeout(1500)
			await mimiri().applicationShowing()

			await expect(lockScreen.container()).not.toBeVisible()
			await expect(settingNodes.controlPanel()).toBeVisible()
		})
	})
})
