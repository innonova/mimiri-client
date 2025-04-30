import { expect } from '@playwright/test'
import { orch } from './clients'
import {
	accountView,
	customerCtrl,
	invoiceItem,
	invoicesView,
	invoiceView,
	paymentMethodsView,
	screenMenu,
} from './selectors'
import { config, customer, password, username } from './data'
import { pwState } from './pw-state'

export const checkPaymentMethods = async () => {
	await screenMenu.methods().click()
	await expect(paymentMethodsView.container()).toBeVisible()
	await expect(paymentMethodsView.card4242()).toBeVisible()
	await expect(paymentMethodsView.card4242IsDefault()).toBeVisible()
	await expect(paymentMethodsView.card4242MakeDefault()).not.toBeVisible()
	await expect(paymentMethodsView.card4242Delete()).toBeVisible()
}

export const checkNoInvoices = async () => {
	await screenMenu.invoices().click()
	await expect(invoicesView.container()).toBeVisible()
	await expect(invoicesView.none()).toBeVisible()
	await expect(invoiceItem.container(config.invoiceNo)).not.toBeVisible()
}

export const checkInvoices = async () => {
	await screenMenu.invoices().click()
	await expect(invoicesView.container()).toBeVisible()
	await expect(invoiceItem.container(config.invoiceNo)).toBeVisible()
	await expect(invoiceItem.statusPaid(config.invoiceNo)).toBeVisible()
	await expect(invoiceItem.statusOpen(config.invoiceNo)).not.toBeVisible()
	await expect(invoiceItem.statusCredited(config.invoiceNo)).not.toBeVisible()
	await expect(invoiceItem.statusCreditNote(config.invoiceNo)).not.toBeVisible()
	await expect(invoiceItem.viewLink(config.invoiceNo)).toBeVisible()
	await expect(invoiceItem.pdfLink(config.invoiceNo)).toBeVisible()
	await expect(invoiceItem.total(config.invoiceNo)).toBeVisible()
	await expect(invoiceItem.total(config.invoiceNo)).toContainText(config.currency)

	await pwState.expectTab('http://localhost:5174/invoice')
	await invoiceItem.viewLink(config.invoiceNo).click()
	await pwState.enterTab()
	await expect(invoiceView.container()).toBeVisible()
	await expect(invoiceView.paidStamp()).toBeVisible()
	await expect(invoiceView.total()).toBeVisible()
	await expect(invoiceView.vat()).toBeVisible()
	await expect(invoiceView.totalVat()).toBeVisible()
	await expect(invoiceView.total()).toContainText(config.currency)
	await expect(invoiceView.vat()).toContainText(config.currency)
	await expect(invoiceView.totalVat()).toContainText(config.currency)

	await pwState.closeTab()
}

export const checkAccount = async () => {
	await screenMenu.account().click()
	await expect(accountView.container()).toBeVisible()
	await expect(accountView.emailVerified()).toBeVisible()
	await expect(accountView.verifyEmail()).not.toBeVisible()
	await expect(customerCtrl.givenName()).toHaveValue(customer.givenName)
	await expect(customerCtrl.familyName()).toHaveValue(customer.familyName)
	await expect(customerCtrl.company()).toHaveValue(customer.company)
	await expect(customerCtrl.email()).toHaveValue(customer.email)
	await expect(customerCtrl.countrySelector()).toHaveValue(customer.countryCode)
	await expect(customerCtrl.stateText()).toHaveValue(customer.state)
	await expect(customerCtrl.city()).toHaveValue(customer.city)
	await expect(customerCtrl.postalCode()).toHaveValue(customer.postalCode)
	await expect(customerCtrl.address()).toHaveValue(customer.address)
}

export const checkUserTier0 = async () => {
	const login = await orch.login(username, password)
	const clientConfig = JSON.parse(login.config)
	await expect(clientConfig.features ?? []).not.toContain('sharing')
	await expect(login.maxTotalBytes).toBe('10485760')
	await expect(login.maxNoteCount).toBe('1000')
	await expect(login.maxNoteBytes).toBe('1048576')
}

export const checkUserTier0WithSharing = async () => {
	const login = await orch.login(username, password)
	const clientConfig = JSON.parse(login.config)
	await expect(login.maxTotalBytes).toBe('10485760')
	await expect(login.maxNoteCount).toBe('1000')
	await expect(login.maxNoteBytes).toBe('1048576')
}

export const checkUserTier1 = async () => {
	const login = await orch.login(username, password)
	const clientConfig = JSON.parse(login.config)
	await expect(login.maxTotalBytes).toBe('104857600')
	await expect(login.maxNoteCount).toBe('10000')
	await expect(login.maxNoteBytes).toBe('10485760')
}

export const checkUserTier2 = async () => {
	const login = await orch.login(username, password)
	const clientConfig = JSON.parse(login.config)
	await expect(login.maxTotalBytes).toBe('204857600')
	await expect(login.maxNoteCount).toBe('20000')
	await expect(login.maxNoteBytes).toBe('10485760')
}

export const checkUserTier3 = async () => {
	const login = await orch.login(username, password)
	const clientConfig = JSON.parse(login.config)
	await expect(login.maxTotalBytes).toBe('504857600')
	await expect(login.maxNoteCount).toBe('50000')
	await expect(login.maxNoteBytes).toBe('10485760')
}
