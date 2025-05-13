import { expect } from '@playwright/test'
import { createCtrl, loginCtrl, mainToolbar, menu, titleBar } from '../selectors'
import { mimiri } from '../framework/mimiri-context'

export const createAccount = async () => {
	await loginCtrl.createAccountLink().click()
	await expect(createCtrl.container()).toBeVisible()
	await createCtrl.username().fill(mimiri().config.username)
	await createCtrl.password().fill(mimiri().config.password)
	await createCtrl.repeat().fill(mimiri().config.password)
	await createCtrl.terms().check()
	await createCtrl.privacy().check()
	await createCtrl.weak().check()
	await createCtrl.noRecover().check()
	await createCtrl.button().click()
	await expect(mainToolbar.container()).toBeVisible({ timeout: 30000 })
	await expect(titleBar.container()).toBeVisible()
	await mimiri().reload()
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
