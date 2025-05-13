import { expect } from '@playwright/test'
import { deleteView, loginCtrl, settingNodes } from '../selectors'
import { mimiri } from '../framework/mimiri-context'

export const deleteAccount = async () => {
	await expect(settingNodes.account()).toBeVisible()
	await settingNodes.account().dblclick()
	await expect(settingNodes.delete()).toBeVisible()
	await settingNodes.delete().click()
	await expect(deleteView.container()).toBeVisible()
	await expect(deleteView.deleteAccount()).toBeVisible()
	await expect(deleteView.deleteData()).toBeVisible()
	await expect(deleteView.noRecovery()).toBeVisible()
	await expect(deleteView.deleteLocal()).toBeVisible()
	await expect(deleteView.deleteAccount()).not.toBeChecked()
	await expect(deleteView.deleteData()).not.toBeChecked()
	await expect(deleteView.noRecovery()).not.toBeChecked()
	await expect(deleteView.deleteLocal()).not.toBeChecked()
	await deleteView.deleteAccount().check()
	await deleteView.deleteData().check()
	await deleteView.noRecovery().check()
	await deleteView.deleteLocal().check()
	await deleteView.password().fill(mimiri().password)
	await deleteView.submit().click()
	await expect(loginCtrl.container()).toBeVisible()
}

export const loginNoLongerAvailable = async () => {
	await expect(loginCtrl.container()).toBeVisible()
	await expect(loginCtrl.username()).toBeVisible()
	await expect(loginCtrl.password()).toBeVisible()
	await expect(loginCtrl.button()).toBeVisible()
	await loginCtrl.username().fill(mimiri().config.username)
	await loginCtrl.password().fill(mimiri().config.password)
	await loginCtrl.button().click()
	await expect(loginCtrl.loginError()).toBeVisible()
}
