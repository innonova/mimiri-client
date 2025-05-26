import { expect } from '@playwright/test'
import { loginCtrl, mainToolbar, menu, promoteAccount, settingNodes, settingView, titleBar } from '../selectors'
import { mimiri } from '../framework/mimiri-context'

export const createAccount = async () => {
	await settingNodes.controlPanel().dblclick()
	await settingNodes.account().click()
	await expect(promoteAccount.container()).toBeVisible()
	await promoteAccount.username().fill(mimiri().config.username)
	await promoteAccount.password().fill(mimiri().config.password)
	await promoteAccount.repeat().fill(mimiri().config.password)
	await promoteAccount.noRecover().check()
	await promoteAccount.button().click()
	await expect(settingView.username()).toBeVisible()
	await expect(mainToolbar.container()).toBeVisible({ timeout: 30000 })
	await expect(titleBar.container()).toBeVisible()
	if (await settingNodes.controlPanelOpen().isVisible()) {
		await settingNodes.controlPanel().dblclick()
	}
}

export const logout = async () => {
	await titleBar.accountButton().click()
	await menu.logout().click()
	await expect(loginCtrl.container()).toBeVisible()
}

export const login = async () => {
	await expect(loginCtrl.container()).toBeVisible()
	await expect(loginCtrl.username()).toBeVisible()
	await expect(loginCtrl.password()).toBeVisible()
	await expect(loginCtrl.button()).toBeVisible()
	await loginCtrl.username().fill(mimiri().config.username)
	await loginCtrl.password().fill(mimiri().config.password)
	await loginCtrl.button().click()
	await expect(mainToolbar.container()).toBeVisible()
	await expect(titleBar.container()).toBeVisible()
}
