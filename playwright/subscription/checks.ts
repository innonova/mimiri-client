import { expect } from '@playwright/test'
import {
	accountView,
	customerCtrl,
	invoiceItem,
	invoicesView,
	invoiceView,
	paymentMethodsView,
	settingNodes,
} from '../selectors'
import { mimiri } from '../framework/mimiri-context'

export const checkPaymentMethods = async () => {
	await settingNodes.methods().click()
	await expect(paymentMethodsView.container()).toBeVisible()
	await expect(paymentMethodsView.card4242()).toBeVisible()
	await expect(paymentMethodsView.card4242IsDefault()).toBeVisible()
	await expect(paymentMethodsView.card4242MakeDefault()).not.toBeVisible()
	await expect(paymentMethodsView.card4242Delete()).toBeVisible()
}

export const checkNoInvoices = async () => {
	await settingNodes.invoices().click()
	await expect(invoicesView.container()).toBeVisible()
	await expect(invoicesView.none()).toBeVisible()
	await expect(invoicesView.numbers()).toBeEmpty()
}

export const checkInvoices = async () => {
	await settingNodes.invoices().click()
	await expect(invoicesView.container()).toBeVisible()
	await expect(invoicesView.numbers()).not.toBeEmpty()
	const numbers = (await invoicesView.numbers().inputValue()).split(',')
	const invoiceNo = parseInt(numbers[0])
	await expect(invoiceItem.container(invoiceNo)).toBeVisible()
	await expect(invoiceItem.statusPaid(invoiceNo)).toBeVisible()
	await expect(invoiceItem.statusOpen(invoiceNo)).not.toBeVisible()
	await expect(invoiceItem.statusCredited(invoiceNo)).not.toBeVisible()
	await expect(invoiceItem.statusCreditNote(invoiceNo)).not.toBeVisible()
	await expect(invoiceItem.viewLink(invoiceNo)).toBeVisible()
	await expect(invoiceItem.pdfLink(invoiceNo)).toBeVisible()
	await expect(invoiceItem.total(invoiceNo)).toBeVisible()
	await expect(invoiceItem.total(invoiceNo)).toContainText(mimiri().config.currency)

	await mimiri().expectTab(mimiri().config.invoiceUrl)
	await invoiceItem.viewLink(invoiceNo).click()
	await mimiri().enterTab()
	await expect(invoiceView.container()).toBeVisible()
	await expect(invoiceView.paidStamp()).toBeVisible()
	await expect(invoiceView.total()).toBeVisible()
	await expect(invoiceView.vat()).toBeVisible()
	await expect(invoiceView.totalVat()).toBeVisible()
	await expect(invoiceView.total()).toContainText(mimiri().config.currency)
	await expect(invoiceView.vat()).toContainText(mimiri().config.currency)
	await expect(invoiceView.totalVat()).toContainText(mimiri().config.currency)

	await mimiri().closeTab()
}

export const checkAccount = async () => {
	await settingNodes.billingAddress().click()
	await expect(accountView.container()).toBeVisible()
	await expect(accountView.emailVerified()).toBeVisible()
	await expect(accountView.verifyEmail()).not.toBeVisible()
	await expect(customerCtrl.givenName()).toHaveValue(mimiri().customer.givenName)
	await expect(customerCtrl.familyName()).toHaveValue(mimiri().customer.familyName)
	await expect(customerCtrl.company()).toHaveValue(mimiri().customer.company)
	await expect(customerCtrl.email()).toHaveValue(mimiri().customer.email)
	await expect(customerCtrl.countrySelector()).toHaveValue(mimiri().customer.countryCode)
	await expect(customerCtrl.stateText()).toHaveValue(mimiri().customer.state)
	await expect(customerCtrl.city()).toHaveValue(mimiri().customer.city)
	await expect(customerCtrl.postalCode()).toHaveValue(mimiri().customer.postalCode)
	await expect(customerCtrl.address()).toHaveValue(mimiri().customer.address)
}

export const checkUserTier0 = async () => {
	const login = await mimiri().login(mimiri().username, mimiri().password)
	const clientConfig = JSON.parse(login.config)
	await expect(clientConfig.features ?? []).not.toContain('sharing')
	await expect(login.maxTotalBytes).toBe('10485760')
	await expect(login.maxNoteCount).toBe('1000')
	await expect(login.maxNoteBytes).toBe('1048576')
}

export const checkUserTier0WithSharing = async () => {
	const login = await mimiri().login(mimiri().username, mimiri().password)
	const clientConfig = JSON.parse(login.config)
	await expect(login.maxTotalBytes).toBe('10485760')
	await expect(login.maxNoteCount).toBe('1000')
	await expect(login.maxNoteBytes).toBe('1048576')
}

export const checkUserTier1 = async () => {
	const login = await mimiri().login(mimiri().username, mimiri().password)
	const clientConfig = JSON.parse(login.config)
	await expect(login.maxTotalBytes).toBe('104857600')
	await expect(login.maxNoteCount).toBe('10000')
	await expect(login.maxNoteBytes).toBe('10485760')
}

export const checkUserTier2 = async () => {
	const login = await mimiri().login(mimiri().username, mimiri().password)
	const clientConfig = JSON.parse(login.config)
	await expect(login.maxTotalBytes).toBe('204857600')
	await expect(login.maxNoteCount).toBe('20000')
	await expect(login.maxNoteBytes).toBe('10485760')
}

export const checkUserTier3 = async () => {
	const login = await mimiri().login(mimiri().username, mimiri().password)
	const clientConfig = JSON.parse(login.config)
	await expect(login.maxTotalBytes).toBe('504857600')
	await expect(login.maxNoteCount).toBe('50000')
	await expect(login.maxNoteBytes).toBe('10485760')
}
