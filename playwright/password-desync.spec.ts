import { expect, test } from '@playwright/test'
import { mimiri, mimiriClone, withMimiriContext } from './framework/mimiri-context'
import { aboutView, changePasswordView, loginCtrl, menu, passwordDialog, settingNodes, titleBar } from './selectors'
import { createTestTree, verifyTestTree } from './notes/actions'
import { miniTestTree } from './notes/data'
import { createCloudAccount, login, logout } from './core/actions'

// test.describe.configure({ mode: 'serial' })

test.describe('password out of sync', () => {
	test('verify reload into new password', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await expect(titleBar.accountButton()).toHaveAttribute('title', 'Account (Online)')
			await createTestTree(miniTestTree)
			await verifyTestTree(miniTestTree)

			await mimiriClone(true)
			await mimiri().home()
			await login()
			await expect(titleBar.accountButton()).toHaveAttribute('title', 'Account (Online)')
			await verifyTestTree(miniTestTree)

			mimiri(0, true)

			await settingNodes.controlPanel().dblclick()
			await settingNodes.account().dblclick()
			await settingNodes.password().click()

			const oldPassword = mimiri().password
			const newPassword = 'qwer'
			mimiri().config.password = newPassword
			await changePasswordView.create().click()
			await changePasswordView.password().fill(mimiri().password)
			await changePasswordView.repeat().fill(mimiri().password)
			await changePasswordView.saveButton().click()
			await expect(passwordDialog.container()).toBeVisible()
			await passwordDialog.password().fill(oldPassword)
			await passwordDialog.okButton().click()
			await expect(passwordDialog.container()).not.toBeVisible()
			await settingNodes.controlPanel().click()
			await expect(aboutView.accountType()).toHaveText('cloud')
			await logout()
			await login()

			mimiri(1, true)
			await mimiri().reload()
			await expect(titleBar.accountButton()).toHaveAttribute('title', 'Account (Offline)')
			await expect(loginCtrl.container()).toBeVisible()
			mimiri().config.password = newPassword
			await loginCtrl.password().fill(mimiri().password)
			await loginCtrl.button().click()
			await expect(titleBar.accountButton()).toHaveAttribute('title', 'Account (Online)')
		})
	})

	test('verify login into new password', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await expect(titleBar.accountButton()).toHaveAttribute('title', 'Account (Online)')
			await createTestTree(miniTestTree)
			await verifyTestTree(miniTestTree)

			await mimiriClone(true)
			await mimiri().home()
			await login()
			await expect(titleBar.accountButton()).toHaveAttribute('title', 'Account (Online)')
			await verifyTestTree(miniTestTree)

			mimiri(0, true)

			await settingNodes.controlPanel().dblclick()
			await settingNodes.account().dblclick()
			await settingNodes.password().click()

			const oldPassword = mimiri().password
			const newPassword = 'qwer'
			mimiri().config.password = newPassword
			await changePasswordView.create().click()
			await changePasswordView.password().fill(mimiri().password)
			await changePasswordView.repeat().fill(mimiri().password)
			await changePasswordView.saveButton().click()
			await expect(passwordDialog.container()).toBeVisible()
			await passwordDialog.password().fill(oldPassword)
			await passwordDialog.okButton().click()
			await expect(passwordDialog.container()).not.toBeVisible()
			await settingNodes.controlPanel().click()
			await expect(aboutView.accountType()).toHaveText('cloud')
			await logout()
			await login()

			mimiri(1, true)
			await logout()
			await expect(titleBar.container()).toBeVisible()
			if (!(await loginCtrl.container().isVisible())) {
				await titleBar.accountButton().click()
				await menu.login().click()
			}
			await expect(loginCtrl.container()).toBeVisible()
			await loginCtrl.username().fill(mimiri().config.username)
			await loginCtrl.password().fill(mimiri().config.password)
			await loginCtrl.button().click()
			await expect(titleBar.accountButton()).toHaveAttribute('title', 'Account (Offline)')
			await expect(loginCtrl.serverIndicator()).toBeVisible()
			mimiri().config.password = newPassword
			await loginCtrl.password().fill(mimiri().password)
			await loginCtrl.button().click()
			await expect(titleBar.accountButton()).toHaveAttribute('title', 'Account (Online)')
		})
	})

	test('verify login into cancel, then go online', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await expect(titleBar.accountButton()).toHaveAttribute('title', 'Account (Online)')
			await createTestTree(miniTestTree)
			await verifyTestTree(miniTestTree)

			await mimiriClone(true)
			await mimiri().home()
			await login()
			await expect(titleBar.accountButton()).toHaveAttribute('title', 'Account (Online)')
			await verifyTestTree(miniTestTree)

			mimiri(0, true)

			await settingNodes.controlPanel().dblclick()
			await settingNodes.account().dblclick()
			await settingNodes.password().click()

			const oldPassword = mimiri().password
			const newPassword = 'qwer'
			mimiri().config.password = newPassword
			await changePasswordView.create().click()
			await changePasswordView.password().fill(mimiri().password)
			await changePasswordView.repeat().fill(mimiri().password)
			await changePasswordView.saveButton().click()
			await expect(passwordDialog.container()).toBeVisible()
			await passwordDialog.password().fill(oldPassword)
			await passwordDialog.okButton().click()
			await expect(passwordDialog.container()).not.toBeVisible()
			await settingNodes.controlPanel().click()
			await expect(aboutView.accountType()).toHaveText('cloud')
			await logout()
			await login()

			mimiri(1, true)
			await logout()
			await expect(titleBar.container()).toBeVisible()
			if (!(await loginCtrl.container().isVisible())) {
				await titleBar.accountButton().click()
				await menu.login().click()
			}
			await expect(loginCtrl.container()).toBeVisible()
			await loginCtrl.username().fill(mimiri().config.username)
			await loginCtrl.password().fill(mimiri().config.password)
			await loginCtrl.button().click()
			await expect(titleBar.accountButton()).toHaveAttribute('title', 'Account (Offline)')
			await expect(loginCtrl.serverIndicator()).toBeVisible()
			await loginCtrl.cancelButton().click()
			await expect(titleBar.accountButton()).toHaveAttribute('title', 'Account (Offline)')
			await settingNodes.controlPanel().click()
			await expect(aboutView.username()).toHaveText(mimiri().config.username)
			await titleBar.accountButton().click()
			await menu.workOffline().click()
			await expect(loginCtrl.container()).toBeVisible()
			mimiri().config.password = newPassword
			await loginCtrl.password().fill(mimiri().password)
			await loginCtrl.button().click()
			await expect(titleBar.accountButton()).toHaveAttribute('title', 'Account (Online)')
		})
	})

	test('verify reload into cancel, then go online', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await expect(titleBar.accountButton()).toHaveAttribute('title', 'Account (Online)')
			await createTestTree(miniTestTree)
			await verifyTestTree(miniTestTree)

			await mimiriClone(true)
			await mimiri().home()
			await login()
			await expect(titleBar.accountButton()).toHaveAttribute('title', 'Account (Online)')
			await verifyTestTree(miniTestTree)

			mimiri(0, true)

			await settingNodes.controlPanel().dblclick()
			await settingNodes.account().dblclick()
			await settingNodes.password().click()

			const oldPassword = mimiri().password
			const newPassword = 'qwer'
			mimiri().config.password = newPassword
			await changePasswordView.create().click()
			await changePasswordView.password().fill(mimiri().password)
			await changePasswordView.repeat().fill(mimiri().password)
			await changePasswordView.saveButton().click()
			await expect(passwordDialog.container()).toBeVisible()
			await passwordDialog.password().fill(oldPassword)
			await passwordDialog.okButton().click()
			await expect(passwordDialog.container()).not.toBeVisible()
			await settingNodes.controlPanel().click()
			await expect(aboutView.accountType()).toHaveText('cloud')
			await logout()
			await login()
			mimiri(1, true)
			await mimiri().reload()
			await expect(titleBar.accountButton()).toHaveAttribute('title', 'Account (Offline)')
			await expect(loginCtrl.container()).toBeVisible()
			await loginCtrl.cancelButton().click()
			await expect(titleBar.accountButton()).toHaveAttribute('title', 'Account (Offline)')
			await titleBar.accountButton().click()
			await menu.workOffline().click()
			await expect(loginCtrl.container()).toBeVisible()
			mimiri().config.password = newPassword
			await loginCtrl.password().fill(mimiri().password)
			await loginCtrl.button().click()
			await expect(titleBar.accountButton()).toHaveAttribute('title', 'Account (Online)')
		})
	})

	test('verify direct login with new password ', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await expect(titleBar.accountButton()).toHaveAttribute('title', 'Account (Online)')
			await createTestTree(miniTestTree)
			await verifyTestTree(miniTestTree)

			await mimiriClone(true)
			await mimiri().home()
			await login()
			await expect(titleBar.accountButton()).toHaveAttribute('title', 'Account (Online)')
			await verifyTestTree(miniTestTree)

			mimiri(0, true)

			await settingNodes.controlPanel().dblclick()
			await settingNodes.account().dblclick()
			await settingNodes.password().click()

			const oldPassword = mimiri().password
			const newPassword = 'qwer'
			mimiri().config.password = newPassword
			await changePasswordView.create().click()
			await changePasswordView.password().fill(mimiri().password)
			await changePasswordView.repeat().fill(mimiri().password)
			await changePasswordView.saveButton().click()
			await expect(passwordDialog.container()).toBeVisible()
			await passwordDialog.password().fill(oldPassword)
			await passwordDialog.okButton().click()
			await expect(passwordDialog.container()).not.toBeVisible()
			await settingNodes.controlPanel().click()
			await expect(aboutView.accountType()).toHaveText('cloud')
			await logout()
			await login()

			mimiri(1, true)
			await logout()
			mimiri().config.password = newPassword
			await login()
			await expect(titleBar.accountButton()).toHaveAttribute('title', 'Account (Online)')
		})
	})
})
