import { executePayment, reloadApp, setNow } from './actions'
import { expect } from '../framework/fixtures'
import {
	subHomeView,
	invoiceItem,
	invoicesView,
	payInvoiceView,
	paymentMethodsView,
	paymentSelector,
	settingNodes,
	subItem,
	dialog,
} from '../selectors'

import { differenceInDays, isBefore } from 'date-fns'
import { mimiri } from '../framework/mimiri-context'

const NEVER = new Date('2100-01-01T00:00:00.000Z')

export const firstRenewal = async () => {
	await settingNodes.subscription().click()
	await expect(subHomeView.currentSubscriptionSku()).not.toBeEmpty()
	const isMonthly = (await subHomeView.currentSubscriptionSku().inputValue()) === 'ABO-001-M'
	if (!isMonthly) {
		await expect(subHomeView.currentSubscriptionSku()).toHaveValue('ABO-001-Y')
	}

	let message = await mimiri().waitForSubjectToInclude('has been created')
	expect(message.Attachments).toHaveLength(1)

	let nextRenewal = await mimiri().nextRenewalDate()
	await expect(nextRenewal.time).toBeBeforeNow()
	await mimiri().triggerRenewals()

	await expect(subItem.endDate()).toBeVisible()
	let paidUntil = new Date((await subHomeView.currentSubscriptionPaidUntil().inputValue()) ?? '')
	if (isMonthly) {
		await expect(paidUntil).toBeInMonths(1)
	} else {
		await expect(paidUntil).toBeInYears(1)
	}

	nextRenewal = await mimiri().nextRenewalDate()
	if (isMonthly) {
		await expect(paidUntil).toBeInWeeks(1, nextRenewal.time)
	} else {
		await expect(paidUntil).toBeInMonths(1, nextRenewal.time)
	}

	await mimiri().triggerNextRenewalsFor()
	message = await mimiri().waitForSubjectToInclude('will renew soon')
	expect(message.Attachments).toHaveLength(0)

	nextRenewal = await mimiri().nextRenewalDate()
	await expect(differenceInDays(paidUntil, nextRenewal.time)).toBe(0)

	await mimiri().triggerNextRenewalsFor()
	message = await mimiri().waitForSubjectToInclude('has been renewed')
	expect(message.Attachments).toHaveLength(1)
	nextRenewal = await mimiri().nextRenewalDate()
	await expect(isBefore(nextRenewal.time, new Date())).toBeTruthy()
	await mimiri().triggerRenewals()

	await reloadApp()
	await expect(subHomeView.currentSubscriptionPaidUntil()).not.toBeEmpty()
	paidUntil = new Date((await subHomeView.currentSubscriptionPaidUntil().inputValue()) ?? '')
	nextRenewal = await mimiri().nextRenewalDate()

	if (isMonthly) {
		await expect(paidUntil).toBeInWeeks(1, nextRenewal.time)
		await expect(paidUntil).toBeInMonths(2)
	} else {
		await expect(paidUntil).toBeInMonths(1, nextRenewal.time)
		await expect(paidUntil).toBeInYears(2)
	}
}

export const secondRenewal = async () => {
	await settingNodes.subscription().click()
	await expect(subHomeView.currentSubscriptionSku()).not.toBeEmpty()
	const isMonthly = (await subHomeView.currentSubscriptionSku().inputValue()) === 'ABO-001-M'
	if (!isMonthly) {
		await expect(subHomeView.currentSubscriptionSku()).toHaveValue('ABO-001-Y')
	}

	await mimiri().deleteTagged()
	expect(await mimiri().list()).toHaveLength(0)

	await mimiri().triggerNextRenewalsFor()
	let message = await mimiri().waitForSubjectToInclude('will renew soon')
	expect(message.Attachments).toHaveLength(0)

	await mimiri().triggerNextRenewalsFor()
	message = await mimiri().waitForSubjectToInclude('has been renewed')
	expect(message.Attachments).toHaveLength(1)
	await mimiri().triggerRenewals()

	await reloadApp()
	await expect(subHomeView.currentSubscriptionPaidUntil()).not.toBeEmpty()
	const paidUntil = new Date((await subHomeView.currentSubscriptionPaidUntil().inputValue()) ?? '')
	const nextRenewal = await mimiri().nextRenewalDate()

	if (isMonthly) {
		await expect(paidUntil).toBeInWeeks(1, nextRenewal.time)
		await expect(paidUntil).toBeInMonths(3)
	} else {
		await expect(paidUntil).toBeInMonths(1, nextRenewal.time)
		await expect(paidUntil).toBeInYears(3)
	}
}

export const retryRenewal = async () => {
	await settingNodes.subscription().click()
	await expect(subHomeView.currentSubscriptionSku()).not.toBeEmpty()
	const isMonthly = (await subHomeView.currentSubscriptionSku().inputValue()) === 'ABO-001-M'
	if (!isMonthly) {
		await expect(subHomeView.currentSubscriptionSku()).toHaveValue('ABO-001-Y')
	}

	let message = await mimiri().waitForSubjectToInclude('has been created')
	expect(message.Attachments).toHaveLength(1)
	await mimiri().deleteTagged()
	expect(await mimiri().list()).toHaveLength(0)

	await mimiri().triggerRenewals()
	await mimiri().triggerNextRenewalsFor()
	message = await mimiri().waitForSubjectToInclude('will renew soon')
	expect(message.Attachments).toHaveLength(0)

	await reloadApp()
	await expect(subHomeView.currentSubscriptionPaidUntil()).not.toBeEmpty()
	let paidUntil = new Date((await subHomeView.currentSubscriptionPaidUntil().inputValue()) ?? '')
	let nextRenewal = await mimiri().nextRenewalDate()
	expect((await nextRenewal).action).toBe('auto-renew')
	await expect(paidUntil).toBeInHours(1, nextRenewal.time)

	expect(await mimiri().list()).toHaveLength(1)
	await mimiri().failNextCharge('500')
	await mimiri().triggerNextRenewalsFor()
	expect(await mimiri().list()).toHaveLength(1)

	nextRenewal = await mimiri().nextRenewalDate()
	expect((await nextRenewal).action).toBe('retry-payment')
	await expect(nextRenewal.time).toBeInHours(5, paidUntil)

	await mimiri().triggerNextRenewalsFor()
	message = await mimiri().waitForSubjectToInclude('has been renewed')
	expect(message.Attachments).toHaveLength(1)
	expect(await mimiri().list()).toHaveLength(2)

	await mimiri().triggerRenewals()

	await reloadApp()
	await expect(subHomeView.currentSubscriptionPaidUntil()).not.toBeEmpty()
	paidUntil = new Date((await subHomeView.currentSubscriptionPaidUntil().inputValue()) ?? '')
	nextRenewal = await mimiri().nextRenewalDate()
	if (isMonthly) {
		await expect(paidUntil).toBeInWeeks(1, nextRenewal.time)
		await expect(paidUntil).toBeInMonths(2)
	} else {
		await expect(paidUntil).toBeInMonths(1, nextRenewal.time)
		await expect(paidUntil).toBeInYears(2)
	}
}

export const retryRenewalTwice = async () => {
	await settingNodes.subscription().click()
	await expect(subHomeView.currentSubscriptionSku()).not.toBeEmpty()
	const isMonthly = (await subHomeView.currentSubscriptionSku().inputValue()) === 'ABO-001-M'
	if (!isMonthly) {
		await expect(subHomeView.currentSubscriptionSku()).toHaveValue('ABO-001-Y')
	}
	let message = await mimiri().waitForSubjectToInclude('has been created')
	expect(message.Attachments).toHaveLength(1)
	await mimiri().deleteTagged()
	expect(await mimiri().list()).toHaveLength(0)

	await mimiri().triggerRenewals()
	await mimiri().triggerNextRenewalsFor()
	message = await mimiri().waitForSubjectToInclude('will renew soon')
	expect(message.Attachments).toHaveLength(0)

	await reloadApp()
	await expect(subHomeView.currentSubscriptionPaidUntil()).not.toBeEmpty()
	let paidUntil = new Date((await subHomeView.currentSubscriptionPaidUntil().inputValue()) ?? '')
	let nextRenewal = await mimiri().nextRenewalDate()
	expect((await nextRenewal).action).toBe('auto-renew')
	await expect(paidUntil).toBeInHours(1, nextRenewal.time)

	expect(await mimiri().list()).toHaveLength(1)
	await mimiri().failNextCharge('500')
	await mimiri().triggerNextRenewalsFor()
	expect(await mimiri().list()).toHaveLength(1)

	nextRenewal = await mimiri().nextRenewalDate()
	expect((await nextRenewal).action).toBe('retry-payment')
	await expect(nextRenewal.time).toBeInHours(5, paidUntil)

	await mimiri().failNextCharge('500')
	await mimiri().triggerNextRenewalsFor()
	expect(await mimiri().list()).toHaveLength(1)

	nextRenewal = await mimiri().nextRenewalDate()
	expect((await nextRenewal).action).toBe('retry-payment-again')
	await expect(nextRenewal.time).toBeInDays(1, paidUntil)

	await mimiri().triggerNextRenewalsFor()
	message = await mimiri().waitForSubjectToInclude('has been renewed')
	expect(message.Attachments).toHaveLength(1)
	expect(await mimiri().list()).toHaveLength(2)

	await mimiri().triggerRenewals()

	await reloadApp()
	await expect(subHomeView.currentSubscriptionPaidUntil()).not.toBeEmpty()
	paidUntil = new Date((await subHomeView.currentSubscriptionPaidUntil().inputValue()) ?? '')
	nextRenewal = await mimiri().nextRenewalDate()
	if (isMonthly) {
		await expect(paidUntil).toBeInWeeks(1, nextRenewal.time)
		await expect(paidUntil).toBeInMonths(2)
	} else {
		await expect(paidUntil).toBeInMonths(1, nextRenewal.time)
		await expect(paidUntil).toBeInYears(2)
	}
}

export const failRenewal = async () => {
	await settingNodes.subscription().click()
	let message = await mimiri().waitForSubjectToInclude('has been created')

	expect(message.Attachments).toHaveLength(1)
	await mimiri().deleteTagged()
	expect(await mimiri().list()).toHaveLength(0)

	await mimiri().triggerRenewals()
	await mimiri().triggerNextRenewalsFor()
	message = await mimiri().waitForSubjectToInclude('will renew soon')
	expect(message.Attachments).toHaveLength(0)

	await reloadApp()
	await expect(subHomeView.currentSubscriptionPaidUntil()).not.toBeEmpty()
	const paidUntil = new Date((await subHomeView.currentSubscriptionPaidUntil().inputValue()) ?? '')
	let nextRenewal = await mimiri().nextRenewalDate()
	expect((await nextRenewal).action).toBe('auto-renew')
	await expect(paidUntil).toBeInHours(1, nextRenewal.time)

	expect(await mimiri().list()).toHaveLength(1)
	await mimiri().failNextCharge('500')
	await mimiri().triggerNextRenewalsFor()
	expect(await mimiri().list()).toHaveLength(1)

	nextRenewal = await mimiri().nextRenewalDate()
	expect((await nextRenewal).action).toBe('retry-payment')
	await expect(nextRenewal.time).toBeInHours(5, paidUntil)

	await mimiri().failNextCharge('500')
	await mimiri().triggerNextRenewalsFor()
	expect(await mimiri().list()).toHaveLength(1)

	nextRenewal = await mimiri().nextRenewalDate()
	expect((await nextRenewal).action).toBe('retry-payment-again')
	await expect(nextRenewal.time).toBeInDays(1, paidUntil)

	await mimiri().failNextCharge('500')
	await mimiri().triggerNextRenewalsFor()
	expect(await mimiri().list()).toHaveLength(1)

	nextRenewal = await mimiri().nextRenewalDate()
	expect((await nextRenewal).action).toBe('verify-payment-failed')
	await expect(nextRenewal.time).toBeInHours(29, paidUntil)
	await mimiri().triggerNextRenewalsFor()

	await mimiri().waitForSubjectToInclude('payment failed')

	nextRenewal = await mimiri().nextRenewalDate()
	expect((await nextRenewal).action).toBe('warn-grace-ending')
	await expect(nextRenewal.time).toBeInWeeks(1, paidUntil)

	await setNow(nextRenewal.time)

	await expect(subItem.overdue()).toBeVisible()
	await expect(subItem.payNow()).toBeVisible()
	await expect(subItem.renewsAutomatically()).not.toBeVisible()

	await setNow(nextRenewal.time)
	await settingNodes.invoices().click()

	await expect(invoicesView.numbers()).not.toBeEmpty()
	const numbers = (await invoicesView.numbers().inputValue()).split(',')
	expect(numbers).toHaveLength(2)
	const invoiceNo = parseInt(numbers[0])
	await expect(invoiceItem.statusOverdue(invoiceNo)).toBeVisible()
	await expect(invoiceItem.payNow(invoiceNo)).toBeVisible()
}

export const recoverFromHome = async () => {
	await settingNodes.subscription().click()
	let nextRenewal = await mimiri().nextRenewalDate()
	await setNow(nextRenewal.time)
	await expect(subHomeView.currentSubscriptionSku()).not.toBeEmpty()
	const isMonthly = (await subHomeView.currentSubscriptionSku().inputValue()) === 'ABO-001-M'
	if (!isMonthly) {
		await expect(subHomeView.currentSubscriptionSku()).toHaveValue('ABO-001-Y')
	}
	await expect(subItem.overdue()).toBeVisible()
	await expect(subItem.payNow()).toBeVisible()
	await expect(subItem.renewsAutomatically()).not.toBeVisible()
	await subItem.payNow().click()
	await paymentSelector.new().click()
	await expect(payInvoiceView.container()).toBeVisible()
	await payInvoiceView.acceptTerms().click()
	await payInvoiceView.acceptPrivacy().click()
	mimiri().expectTab(mimiri().config.payUrl)
	await payInvoiceView.payButton().click()
	await executePayment()
	await expect(subHomeView.container()).toBeVisible()
	await setNow(nextRenewal.time)
	await expect(subHomeView.container()).toBeVisible()
	await expect(subItem.overdue()).not.toBeVisible()
	await expect(subItem.payNow()).not.toBeVisible()
	await expect(subItem.renewsAutomatically()).toBeVisible()

	await mimiri().waitForSubjectToInclude('has been renewed')

	await mimiri().triggerRenewals()

	await expect(subHomeView.currentSubscriptionPaidUntil()).not.toBeEmpty()
	const paidUntil = new Date((await subHomeView.currentSubscriptionPaidUntil().inputValue()) ?? '')
	nextRenewal = await mimiri().nextRenewalDate()

	if (isMonthly) {
		await expect(paidUntil).toBeInWeeks(1, nextRenewal.time)
		await expect(paidUntil).toBeInMonths(2)
	} else {
		await expect(paidUntil).toBeInMonths(1, nextRenewal.time)
		await expect(paidUntil).toBeInYears(2)
	}
}

export const recoverFromInvoices = async () => {
	await settingNodes.subscription().click()
	let nextRenewal = await mimiri().nextRenewalDate()
	await setNow(nextRenewal.time)
	await expect(subHomeView.currentSubscriptionSku()).not.toBeEmpty()
	const isMonthly = (await subHomeView.currentSubscriptionSku().inputValue()) === 'ABO-001-M'
	if (!isMonthly) {
		await expect(subHomeView.currentSubscriptionSku()).toHaveValue('ABO-001-Y')
	}
	nextRenewal = await mimiri().nextRenewalDate()
	await setNow(nextRenewal.time)
	await settingNodes.invoices().click()

	await expect(invoicesView.numbers()).not.toBeEmpty()
	const numbers = (await invoicesView.numbers().inputValue()).split(',')
	expect(numbers).toHaveLength(2)
	const invoiceNo = parseInt(numbers[0])

	await expect(invoiceItem.statusOverdue(invoiceNo)).toBeVisible()
	await expect(invoiceItem.payNow(invoiceNo)).toBeVisible()
	await invoiceItem.payNow(invoiceNo).click()
	await paymentSelector.new().click()
	await expect(payInvoiceView.container()).toBeVisible()
	await payInvoiceView.acceptTerms().click()
	await payInvoiceView.acceptPrivacy().click()
	mimiri().expectTab(mimiri().config.payUrl)
	await payInvoiceView.payButton().click()
	await executePayment()
	await expect(invoicesView.container()).toBeVisible()
	await expect(invoiceItem.statusOverdue(invoiceNo)).not.toBeVisible()
	await expect(invoiceItem.payNow(invoiceNo)).not.toBeVisible()
	await expect(invoiceItem.statusPaid(invoiceNo)).toBeVisible()

	await mimiri().waitForSubjectToInclude('has been renewed')

	await mimiri().triggerRenewals()

	await settingNodes.subscription().click()
	await expect(subHomeView.currentSubscriptionPaidUntil()).not.toBeEmpty()
	const paidUntil = new Date((await subHomeView.currentSubscriptionPaidUntil().inputValue()) ?? '')
	nextRenewal = await mimiri().nextRenewalDate()

	if (isMonthly) {
		await expect(paidUntil).toBeInWeeks(1, nextRenewal.time)
		await expect(paidUntil).toBeInMonths(2)
	} else {
		await expect(paidUntil).toBeInMonths(1, nextRenewal.time)
		await expect(paidUntil).toBeInYears(2)
	}
}

export const failRenewalNoMethods = async () => {
	await settingNodes.subscription().click()
	await expect(subHomeView.currentSubscriptionPaidUntil()).not.toBeEmpty()
	const paidUntil = new Date((await subHomeView.currentSubscriptionPaidUntil().inputValue()) ?? '')
	let message = await mimiri().waitForSubjectToInclude('has been created')
	expect(message.Attachments).toHaveLength(1)
	await mimiri().deleteTagged()
	expect(await mimiri().list()).toHaveLength(0)
	await mimiri().triggerRenewals()

	await settingNodes.methods().click()
	await expect(paymentMethodsView.container()).toBeVisible()
	await expect(paymentMethodsView.card4242()).toBeVisible()
	await paymentMethodsView.card4242Delete().click()
	await expect(dialog.deletePaymentMethod()).toBeVisible()
	await expect(dialog.yes()).toBeVisible()
	await dialog.yes().click()
	await expect(paymentMethodsView.card4242()).not.toBeVisible()

	await mimiri().triggerNextRenewalsFor()
	message = await mimiri().waitForSubjectToInclude('will renew soon')
	expect(message.Attachments).toHaveLength(0)

	let nextRenewal = await mimiri().nextRenewalDate()
	expect((await nextRenewal).action).toBe('auto-renew')
	await expect(paidUntil).toBeInHours(1, nextRenewal.time)

	await mimiri().triggerNextRenewalsFor()

	nextRenewal = await mimiri().nextRenewalDate()
	expect((await nextRenewal).action).toBe('verify-payment-failed')
	await expect(paidUntil).toBeInHours(1, nextRenewal.time)

	await mimiri().triggerNextRenewalsFor()
	message = await mimiri().waitForSubjectToInclude('payment failed')
	expect(await mimiri().list()).toHaveLength(2)

	const prevRenewal = nextRenewal
	nextRenewal = await mimiri().nextRenewalDate()
	expect((await nextRenewal).action).toBe('warn-grace-ending')
	await expect(nextRenewal.time).toBeInWeeks(1, prevRenewal.time)

	await setNow(nextRenewal.time)

	await settingNodes.subscription().click()

	await expect(subItem.overdue()).toBeVisible()
	await expect(subItem.payNow()).toBeVisible()
	await expect(subItem.renewsAutomatically()).not.toBeVisible()

	await setNow(nextRenewal.time)
	await settingNodes.invoices().click()

	await expect(invoicesView.numbers()).not.toBeEmpty()
	const numbers = (await invoicesView.numbers().inputValue()).split(',')
	expect(numbers).toHaveLength(2)
	const invoiceNo = parseInt(numbers[0])
	await expect(invoiceItem.statusOverdue(invoiceNo)).toBeVisible()
	await expect(subItem.renewsAutomatically()).not.toBeVisible()
}

export const cancelSubscription = async () => {
	const message = await mimiri().waitForSubjectToInclude('has been created')
	expect(message.Attachments).toHaveLength(1)
	await mimiri().deleteTagged()
	expect(await mimiri().list()).toHaveLength(0)
	await mimiri().triggerRenewals()

	await settingNodes.subscription().click()
	await expect(subHomeView.currentSubscriptionPaidUntil()).not.toBeEmpty()
	const paidUntil = new Date((await subHomeView.currentSubscriptionPaidUntil().inputValue()) ?? '')

	await expect(subItem.yearlyCancel(1)).toBeVisible()
	await subItem.yearlyCancel(1).click()
	await expect(subItem.ends()).toBeVisible()
	await mimiri().triggerRenewals()
	await mimiri().triggerNextRenewalsFor()
	let nextRenewal = await mimiri().nextRenewalDate()
	expect((await nextRenewal).action).toBe('end-subscription')
	await expect(nextRenewal.time).toBeInDays(1, paidUntil)

	await mimiri().triggerNextRenewalsFor()
	nextRenewal = await mimiri().nextRenewalDate()
	expect((await nextRenewal).action).toBe('none')
	await expect(nextRenewal.time).toBeInDays(0, NEVER)
	await reloadApp()
}

export const failRenewalDeclined = async () => {
	await settingNodes.subscription().click()
	let message = await mimiri().waitForSubjectToInclude('has been created')
	expect(message.Attachments).toHaveLength(1)
	await mimiri().deleteTagged()
	expect(await mimiri().list()).toHaveLength(0)

	await mimiri().triggerRenewals()
	await mimiri().triggerNextRenewalsFor()
	message = await mimiri().waitForSubjectToInclude('will renew soon')
	expect(message.Attachments).toHaveLength(0)

	await reloadApp()
	await expect(subHomeView.currentSubscriptionPaidUntil()).not.toBeEmpty()
	const paidUntil = new Date((await subHomeView.currentSubscriptionPaidUntil().inputValue()) ?? '')
	let nextRenewal = await mimiri().nextRenewalDate()
	expect((await nextRenewal).action).toBe('auto-renew')
	await expect(paidUntil).toBeInHours(1, nextRenewal.time)

	expect(await mimiri().list()).toHaveLength(1)
	await mimiri().failNextCharge('decline')
	await mimiri().triggerNextRenewalsFor()
	expect(await mimiri().list()).toHaveLength(1)

	nextRenewal = await mimiri().nextRenewalDate()
	expect((await nextRenewal).action).toBe('retry-payment-again')
	await expect(nextRenewal.time).toBeInDays(1, paidUntil)

	await mimiri().failNextCharge('decline')
	await mimiri().triggerNextRenewalsFor()
	expect(await mimiri().list()).toHaveLength(1)

	nextRenewal = await mimiri().nextRenewalDate()
	expect((await nextRenewal).action).toBe('verify-payment-failed')
	await expect(nextRenewal.time).toBeInHours(29, paidUntil)
	await mimiri().triggerNextRenewalsFor()

	await mimiri().waitForSubjectToInclude('payment failed')

	nextRenewal = await mimiri().nextRenewalDate()
	expect((await nextRenewal).action).toBe('warn-grace-ending')
	await expect(nextRenewal.time).toBeInWeeks(1, paidUntil)

	await setNow(nextRenewal.time)
	await expect(subItem.overdue()).toBeVisible()
	await expect(subItem.payNow()).toBeVisible()
	await expect(subItem.renewsAutomatically()).not.toBeVisible()

	await setNow(nextRenewal.time)
	await settingNodes.invoices().click()

	await expect(invoicesView.numbers()).not.toBeEmpty()
	const numbers = (await invoicesView.numbers().inputValue()).split(',')
	expect(numbers).toHaveLength(2)
	const invoiceNo = parseInt(numbers[0])
	await expect(invoiceItem.statusOverdue(invoiceNo)).toBeVisible()
	await expect(invoiceItem.payNow(invoiceNo)).toBeVisible()
}

export const ignoreRenewalFailure = async () => {
	let nextRenewal = await mimiri().nextRenewalDate()
	await setNow(nextRenewal.time)
	await settingNodes.subscription().click()
	await expect(subHomeView.container()).toBeVisible()
	await expect(subHomeView.currentSubscriptionPaidUntil()).not.toBeEmpty()
	await expect(subHomeView.currentSubscriptionSku()).not.toBeEmpty()
	const paidUntil = new Date((await subHomeView.currentSubscriptionPaidUntil().inputValue()) ?? '')
	const isMonthly = (await subHomeView.currentSubscriptionSku().inputValue()) === 'ABO-001-M'
	if (!isMonthly) {
		await expect(subHomeView.currentSubscriptionSku()).toHaveValue('ABO-001-Y')
	}
	expect((await nextRenewal).action).toBe('warn-grace-ending')

	await expect(subItem.overdue()).toBeVisible()
	await expect(subItem.payNow()).toBeVisible()
	await expect(subItem.renewsAutomatically()).not.toBeVisible()
	await mimiri().triggerNextRenewalsFor()
	await mimiri().waitForSubjectToInclude('will be suspended soon')

	nextRenewal = await mimiri().nextRenewalDate()
	expect((await nextRenewal).action).toBe('grace-ended')
	await expect(nextRenewal.time).toBeInWeeks(2, paidUntil)

	await mimiri().triggerNextRenewalsFor()
	await mimiri().waitForSubjectToInclude('has been suspended')
	nextRenewal = await mimiri().nextRenewalDate()
	expect((await nextRenewal).action).toBe('warn-suspension-ending')
	await expect(nextRenewal.time).toBeInWeeks(6, paidUntil)

	await mimiri().triggerNextRenewalsFor()
	await mimiri().waitForSubjectToInclude('is suspended and will be cancelled soon')
	nextRenewal = await mimiri().nextRenewalDate()
	expect((await nextRenewal).action).toBe('suspension-ended')
	await expect(nextRenewal.time).toBeInWeeks(12, paidUntil)

	await mimiri().triggerNextRenewalsFor()
	await mimiri().waitForSubjectToInclude('has been cancelled')
	nextRenewal = await mimiri().nextRenewalDate()
	expect((await nextRenewal).action).toBe('none')
	await expect(nextRenewal.time).toBeInDays(0, NEVER)
}
