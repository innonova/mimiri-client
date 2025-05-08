import { expect } from '@playwright/test'
import {
	accountView,
	invoicesView,
	menu,
	paymentMethodsView,
	settingNodes,
	settingView,
	subHomeView,
	titleBar,
} from '../selectors'
import { mimiri } from '../framework/mimiri-context'

export const verifySettings = async () => {
	await expect(settingNodes.controlPanel()).toBeVisible()
	await expect(settingNodes.recycleBin()).toBeVisible()
	await settingNodes.controlPanel().click()
	await expect(settingView.about()).toBeVisible()
	await settingNodes.controlPanel().dblclick()

	await expect(settingNodes.update()).toBeVisible()
	await settingNodes.update().click()
	await expect(settingView.update()).toBeVisible()
	await expect(settingNodes.settingGroup()).toBeVisible()
	await settingNodes.settingGroup().click()
	await expect(settingView.general()).toBeVisible()
	await settingNodes.settingGroup().dblclick()
	await expect(settingNodes.general()).toBeVisible()
	await settingNodes.general().click()
	await expect(settingView.general()).toBeVisible()
	await expect(settingNodes.pin()).toBeVisible()
	await settingNodes.pin().click()
	await expect(settingView.pinCode()).toBeVisible()

	await expect(settingNodes.account()).toBeVisible()
	await settingNodes.account().click()
	await expect(settingView.username()).toBeVisible()
	await settingNodes.account().dblclick()
	await expect(settingNodes.username()).toBeVisible()
	await settingNodes.username().click()
	await expect(settingView.username()).toBeVisible()
	await expect(settingNodes.password()).toBeVisible()
	await settingNodes.password().click()
	await expect(settingView.password()).toBeVisible()
	await expect(settingNodes.delete()).toBeVisible()
	await settingNodes.delete().click()
	await expect(settingView.deleteAccount()).toBeVisible()

	await expect(settingNodes.subscriptionGroup()).toBeVisible()
	await settingNodes.subscriptionGroup().click()
	await expect(subHomeView.container()).toBeVisible()
	await settingNodes.subscriptionGroup().dblclick()
	await expect(settingNodes.subscription()).toBeVisible()
	await settingNodes.subscription().click()
	await expect(subHomeView.container()).toBeVisible()
	await expect(settingNodes.billingAddress()).toBeVisible()
	await settingNodes.billingAddress().click()
	await expect(accountView.container()).toBeVisible()
	await expect(settingNodes.methods()).toBeVisible()
	await settingNodes.methods().click()
	await expect(paymentMethodsView.container()).toBeVisible()
	await expect(settingNodes.invoices()).toBeVisible()
	await settingNodes.invoices().click()
	await expect(invoicesView.container()).toBeVisible()
}

export const verifySettingsFromAccountMenu = async () => {
	await expect(settingNodes.controlPanel()).toBeVisible()
	await expect(titleBar.accountButton()).toBeVisible()
	await expect(settingView.username()).not.toBeVisible()
	await expect(settingNodes.username()).not.toBeVisible()
	await titleBar.accountButton().click()
	await menu.changeUsername().click()
	await expect(settingNodes.username()).toBeVisible()
	await expect(settingView.username()).toBeVisible()

	await titleBar.accountButton().click()
	await menu.changePassword().click()
	await expect(settingNodes.password()).toBeVisible()
	await expect(settingView.password()).toBeVisible()

	await titleBar.accountButton().click()
	await menu.deleteAccount().click()
	await expect(settingNodes.delete()).toBeVisible()
	await expect(settingView.deleteAccount()).toBeVisible()

	await titleBar.accountButton().click()
	await menu.manageSubscription().click()
	await expect(settingNodes.subscription()).toBeVisible()
	await expect(subHomeView.container()).toBeVisible()

	await titleBar.accountButton().click()
	await menu.manageSubscription().click()
	await expect(settingNodes.subscription()).toBeVisible()
	await expect(subHomeView.container()).toBeVisible()

	await titleBar.help().click()
	await menu.about().click()
	await expect(settingView.about()).toBeVisible()

	await titleBar.edit().click()
	await menu.settings().click()
	await expect(settingNodes.general()).toBeVisible()
	await expect(settingView.general()).toBeVisible()
}

export const verifySubscriptionToggle = async () => {
	await expect(settingNodes.controlPanel()).toBeVisible()
	await expect(titleBar.accountButton()).toBeVisible()
	await titleBar.accountButton().click()
	await expect(menu.manageSubscription()).not.toBeVisible()
	await titleBar.accountButton().click()
	await settingNodes.controlPanel().dblclick()

	await expect(settingNodes.update()).toBeVisible()
	await expect(settingNodes.settingGroup()).toBeVisible()
	await expect(settingNodes.account()).toBeVisible()
	await expect(settingNodes.subscriptionGroup()).not.toBeVisible()

	await mimiri().enableSubscription()
	await mimiri().reload()
	await expect(titleBar.container()).toBeVisible()

	await expect(settingNodes.controlPanel()).toBeVisible()
	await expect(titleBar.accountButton()).toBeVisible()
	await titleBar.accountButton().click()
	await expect(menu.manageSubscription()).toBeVisible()
	await titleBar.accountButton().click()

	await expect(settingNodes.update()).toBeVisible()
	await expect(settingNodes.settingGroup()).toBeVisible()
	await expect(settingNodes.account()).toBeVisible()
	await expect(settingNodes.subscriptionGroup()).toBeVisible()
}

export const verifySystemMenu = async () => {
	await expect(menu.refresh()).toBeVisible()
	await expect(menu.delete()).not.toBeVisible()
	await expect(menu.rename()).not.toBeVisible()
	await expect(menu.copy()).not.toBeVisible()
	await expect(menu.cut()).not.toBeVisible()
	await expect(menu.paste()).not.toBeVisible()
	await expect(menu.share()).not.toBeVisible()
	await expect(menu.newNote()).not.toBeVisible()
	await expect(menu.newRootNote()).not.toBeVisible()
}

export const verifySystemContextMenu = async () => {
	await expect(settingNodes.controlPanel()).toBeVisible()
	await expect(settingNodes.recycleBin()).toBeVisible()
	await settingNodes.controlPanel().dblclick()
	await settingNodes.controlPanel().click({ button: 'right' })
	await verifySystemMenu()
	await menu.backdrop().click()

	await settingNodes.update().click({ button: 'right' })
	await verifySystemMenu()
	await menu.backdrop().click()

	await settingNodes.settingGroup().click({ button: 'right' })
	await verifySystemMenu()
	await menu.backdrop().click()
	await settingNodes.settingGroup().dblclick()

	await settingNodes.account().click({ button: 'right' })
	await verifySystemMenu()
	await menu.backdrop().click()
	await settingNodes.account().dblclick()

	await settingNodes.subscriptionGroup().click({ button: 'right' })
	await verifySystemMenu()
	await menu.backdrop().click()
	await settingNodes.subscriptionGroup().dblclick()

	await settingNodes.general().click({ button: 'right' })
	await verifySystemMenu()
	await menu.backdrop().click()

	await settingNodes.pin().click({ button: 'right' })
	await verifySystemMenu()
	await menu.backdrop().click()

	await settingNodes.username().click({ button: 'right' })
	await verifySystemMenu()
	await menu.backdrop().click()

	await settingNodes.password().click({ button: 'right' })
	await verifySystemMenu()
	await menu.backdrop().click()

	await settingNodes.delete().click({ button: 'right' })
	await verifySystemMenu()
	await menu.backdrop().click()

	await settingNodes.subscription().click({ button: 'right' })
	await verifySystemMenu()
	await menu.backdrop().click()

	await settingNodes.billingAddress().click({ button: 'right' })
	await verifySystemMenu()
	await menu.backdrop().click()

	await settingNodes.methods().click({ button: 'right' })
	await verifySystemMenu()
	await menu.backdrop().click()

	await settingNodes.invoices().click({ button: 'right' })
	await verifySystemMenu()
	await menu.backdrop().click()
}
