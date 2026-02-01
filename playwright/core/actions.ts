import { expect } from '@playwright/test'
import {
	aboutView,
	appMain,
	clearLocalDataDialog,
	connectCloudView,
	createAccountView,
	editor,
	lockScreen,
	loginCtrl,
	mainToolbar,
	menu,
	passwordDialog,
	pinCodeView,
	settingNodes,
	settingView,
	statusBar,
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
	await mimiri().waitForTimeout(500)
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
	await mimiri().waitForTimeout(500)
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
	await expect(settingView.currentPlan()).toBeVisible()
	await expect(settingNodes.controlPanel()).toBeVisible()
	await settingNodes.subscriptionGroup().dblclick()
	await settingNodes.controlPanel().dblclick()
	await expect(aboutView.username()).toHaveText(mimiri().config.username)
	await mimiri().waitForTimeout(500)
}

export const logout = async () => {
	await titleBar.accountButton().click()
	await menu.logout().click()
	if (await clearLocalDataDialog.container().isVisible()) {
		await clearLocalDataDialog.logoutButton().click()
	}
	await expect(loginCtrl.container()).toBeVisible()
	// await settingNodes.controlPanel().click()
	// await expect(aboutView.username()).toHaveText('local')
}

export const login = async () => {
	const isMobile = await mimiri().isMobile()
	if (isMobile) {
		await expect(mainToolbar.container()).toBeVisible()
		if (!(await loginCtrl.container().isVisible())) {
			await mainToolbar.account().click()
			await menu.login().click()
		}
	} else {
		await expect(titleBar.container()).toBeVisible()
		if (!(await loginCtrl.container().isVisible())) {
			await titleBar.accountButton().click()
			await menu.login().click()
		}
	}
	await expect(loginCtrl.container()).toBeVisible()
	await loginCtrl.username().fill(mimiri().config.username)
	await loginCtrl.password().fill(mimiri().config.password)
	await loginCtrl.button().click()
	await mimiri().waitForTimeout(1000)
	await settingNodes.controlPanel().click()
	await expect(aboutView.username()).toHaveText(mimiri().config.username)
	await mimiri().waitForTimeout(500)
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

export const setPin = async (pin: string) => {
	if (await settingNodes.controlPanelClosed().isVisible()) {
		await settingNodes.controlPanelClosed().click()
	}
	if (await settingNodes.settingGroupClosed().isVisible()) {
		await settingNodes.settingGroupClosed().click()
	}
	await settingNodes.pin().click()
	await expect(pinCodeView.container()).toBeVisible()

	await mimiri().page.keyboard.type(pin)

	await pinCodeView.save().click()

	await expect(passwordDialog.container()).toBeVisible()
	await passwordDialog.password().fill(mimiri().password)
	await passwordDialog.okButton().click()
	await expect(passwordDialog.container()).not.toBeVisible()
}

export const enterPin = async (pin: string) => {
	await expect(lockScreen.container()).toBeVisible()
	await mimiri().page.keyboard.type(pin)
	await expect(lockScreen.container()).not.toBeVisible()
	await expect(loginCtrl.container()).not.toBeVisible()
	await expect(settingNodes.controlPanel()).toBeVisible()
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

export const waitForSyncToEnd = async () => {
	await editor.save().click()
	await expect(statusBar.syncStatusCode()).toHaveValue(
		/idle|total-size-limit-exceeded|count-limit-exceeded|note-size-limit-exceeded|server-rejection|synchronization-error/,
	)
}

export const saveNote = async () => {
	await editor.save().click()
	await waitForSyncToEnd()
}
