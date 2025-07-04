import { expect } from '@playwright/test'
import {
	aboutView,
	connectCloudView,
	createAccountView,
	loginCtrl,
	mainToolbar,
	menu,
	promoteAccount,
	settingNodes,
	settingView,
	titleBar,
	usernameInput,
} from '../selectors'
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

export const createLocalAccount = async () => {
	await settingNodes.controlPanel().dblclick()
	await settingNodes.createAccount().click()
	await createAccountView.localTab().click()
	await createAccountView.username().fill(mimiri().config.username)
	await createAccountView.password().fill(mimiri().config.password)
	await createAccountView.repeat().fill(mimiri().config.password)
	await expect(usernameInput.status()).not.toBeVisible()
	await createAccountView.button().click()
	await expect(createAccountView.container()).not.toBeVisible()
	await expect(settingNodes.controlPanel()).toBeVisible()
	await settingNodes.controlPanel().click()
	await expect(aboutView.username()).toHaveText(mimiri().config.username)
}

export const connectLocalAccount = async () => {
	if (await settingNodes.controlPanelClosed().isVisible()) {
		await settingNodes.controlPanel().dblclick()
	}
	if (await settingNodes.controlPanelClosed().isVisible()) {
		await settingNodes.controlPanel().dblclick()
	}
	await settingNodes.account().click()
	await connectCloudView.currentPassword().fill(mimiri().config.password)
	await expect(usernameInput.available()).toBeVisible()
	await connectCloudView.button().click()
	await expect(connectCloudView.container()).not.toBeVisible()
	await expect(settingNodes.controlPanel()).toBeVisible()
	await settingNodes.controlPanel().click()
	await expect(aboutView.username()).toHaveText(mimiri().config.username)
}

export const createCloudAccount = async () => {
	await settingNodes.controlPanel().dblclick()
	await settingNodes.createAccount().click()
	await createAccountView.cloudTab().click()
	await createAccountView.username().fill(mimiri().config.username)
	await createAccountView.password().fill(mimiri().config.password)
	await createAccountView.repeat().fill(mimiri().config.password)
	await expect(usernameInput.available()).toBeVisible()
	await createAccountView.button().click()
	await expect(createAccountView.container()).not.toBeVisible()
	await expect(settingNodes.controlPanel()).toBeVisible()
	await settingNodes.controlPanel().click()
	await expect(aboutView.username()).toHaveText(mimiri().config.username)
}

export const logout = async () => {
	await titleBar.accountButton().click()
	await menu.logout().click()
	await settingNodes.controlPanel().click()
	await expect(aboutView.username()).toHaveText('local')
}

export const login = async () => {
	await titleBar.accountButton().click()
	await menu.login().click()
	await loginCtrl.username().fill(mimiri().config.username)
	await loginCtrl.password().fill(mimiri().config.password)
	await loginCtrl.button().click()
	await settingNodes.controlPanel().click()
	await expect(aboutView.username()).toHaveText(mimiri().config.username)
}
