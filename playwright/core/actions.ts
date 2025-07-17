import { expect } from '@playwright/test'
import {
	aboutView,
	appMain,
	connectCloudView,
	createAccountView,
	loginCtrl,
	menu,
	settingNodes,
	titleBar,
	usernameInput,
} from '../selectors'
import { mimiri } from '../framework/mimiri-context'

export const createLocalAccount = async () => {
	if (await settingNodes.controlPanelClosed().isVisible()) {
		await settingNodes.controlPanel().dblclick()
	}
	await settingNodes.createAccount().click()
	await createAccountView.localTab().click()
	await createAccountView.username().fill(mimiri().config.username)
	await createAccountView.password().fill(mimiri().config.password)
	await createAccountView.repeat().fill(mimiri().config.password)
	await expect(usernameInput.status()).not.toBeVisible()
	await createAccountView.button().click()
	await expect(createAccountView.container()).not.toBeVisible()
	await mimiri().waitForTimeout(1000)
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
	await mimiri().waitForTimeout(1000)
	await expect(settingNodes.controlPanel()).toBeVisible()
	await settingNodes.controlPanel().click()
	await expect(aboutView.username()).toHaveText(mimiri().config.username)
}

export const createCloudAccount = async () => {
	if (await settingNodes.controlPanelClosed().isVisible()) {
		await settingNodes.controlPanel().dblclick()
	}
	await settingNodes.createAccount().click()
	await createAccountView.cloudTab().click()
	await createAccountView.username().fill(mimiri().config.username)
	await createAccountView.password().fill(mimiri().config.password)
	await createAccountView.repeat().fill(mimiri().config.password)
	await expect(usernameInput.available()).toBeVisible()
	await createAccountView.button().click()
	await expect(createAccountView.container()).not.toBeVisible()
	await mimiri().waitForTimeout(1000)
	await expect(settingNodes.controlPanel()).toBeVisible()
	await settingNodes.controlPanel().click()
	await expect(aboutView.username()).toHaveText(mimiri().config.username)
}

export const logout = async () => {
	await titleBar.accountButton().click()
	await menu.logout().click()
	expect(loginCtrl.container()).toBeVisible()
	// await settingNodes.controlPanel().click()
	// await expect(aboutView.username()).toHaveText('local')
}

export const login = async () => {
	await expect(titleBar.container()).toBeVisible()
	if (!(await loginCtrl.container().isVisible())) {
		await titleBar.accountButton().click()
		await menu.login().click()
	}
	await expect(loginCtrl.container()).toBeVisible()
	await loginCtrl.username().fill(mimiri().config.username)
	await loginCtrl.password().fill(mimiri().config.password)
	await loginCtrl.button().click()
	await mimiri().waitForTimeout(1000)
	await settingNodes.controlPanel().click()
	await expect(aboutView.username()).toHaveText(mimiri().config.username)
}

export const loginFail = async () => {
	await expect(titleBar.container()).toBeVisible()
	if (!(await loginCtrl.container().isVisible())) {
		await titleBar.accountButton().click()
		await menu.login().click()
	}
	await expect(loginCtrl.container()).toBeVisible()
	await loginCtrl.username().fill(mimiri().config.username)
	await loginCtrl.password().fill(mimiri().config.password)
	await loginCtrl.button().click()
	await expect(loginCtrl.loginError()).toBeVisible()
}

export const appReady = async () => {
	await expect(appMain.status()).toHaveValue('ready')
}

export const appReadyCycle = async () => {
	await expect(appMain.status()).not.toHaveValue('ready')
	await expect(appMain.status()).toHaveValue('ready')
}

export const goOffline = async () => {
	await titleBar.accountButton().click()
	await menu.workOffline().click()
	await expect(titleBar.accountButton()).toHaveAttribute('title', 'Account (Offline)')
}

export const goOnline = async () => {
	await titleBar.accountButton().click()
	await menu.workOffline().click()
	await expect(titleBar.accountButton()).toHaveAttribute('title', 'Account (Online)')
}
