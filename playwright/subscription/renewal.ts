import { executePayment, reloadApp, setNow } from './actions'
import { mail, orch } from './clients'
import { config, username } from './data'
import { expect } from './fixtures'
import { pwState } from './pw-state'
import {
	homeView,
	invoiceItem,
	invoicesView,
	menu,
	payInvoiceView,
	paymentMethodsView,
	paymentSelector,
	screenMenu,
	subItem,
} from './selectors'
import { differenceInDays, isBefore } from 'date-fns'

const NEVER = new Date(2100, 0, 1)

export const firstRenewal = async () => {
	await screenMenu.subscription().click()
	await expect(homeView.currentSubscriptionSku()).not.toBeEmpty()
	const isMonthly = (await homeView.currentSubscriptionSku().inputValue()) === 'ABO-001-M'
	if (!isMonthly) {
		await expect(homeView.currentSubscriptionSku()).toHaveValue('ABO-001-Y')
	}

	let message = await mail.waitForSubjectToInclude('has been created', config.testId)
	expect(message.Attachments).toHaveLength(1)

	let nextRenewal = await orch.nextRenewalDate(username)
	await expect(nextRenewal.time).toBeBeforeNow()
	await orch.triggerRenewals()

	await expect(subItem.endDate()).toBeVisible()
	let paidUntil = new Date((await homeView.currentSubscriptionPaidUntil().inputValue()) ?? '')
	if (isMonthly) {
		await expect(paidUntil).toBeInMonths(1)
	} else {
		await expect(paidUntil).toBeInYears(1)
	}

	nextRenewal = await orch.nextRenewalDate(username)
	if (isMonthly) {
		await expect(paidUntil).toBeInWeeks(1, nextRenewal.time)
	} else {
		await expect(paidUntil).toBeInMonths(1, nextRenewal.time)
	}

	await orch.triggerNextRenewalsFor(username)
	message = await mail.waitForSubjectToInclude('will renew soon', config.testId)
	expect(message.Attachments).toHaveLength(0)

	nextRenewal = await orch.nextRenewalDate(username)
	await expect(differenceInDays(paidUntil, nextRenewal.time)).toBe(0)

	await orch.triggerNextRenewalsFor(username)
	message = await mail.waitForSubjectToInclude('has been renewed', config.testId)
	expect(message.Attachments).toHaveLength(1)
	nextRenewal = await orch.nextRenewalDate(username)
	await expect(isBefore(nextRenewal.time, new Date())).toBeTruthy()
	await orch.triggerRenewals()

	await reloadApp()
	await expect(homeView.currentSubscriptionPaidUntil()).not.toBeEmpty()
	paidUntil = new Date((await homeView.currentSubscriptionPaidUntil().inputValue()) ?? '')
	nextRenewal = await orch.nextRenewalDate(username)

	if (isMonthly) {
		await expect(paidUntil).toBeInWeeks(1, nextRenewal.time)
		await expect(paidUntil).toBeInMonths(2)
	} else {
		await expect(paidUntil).toBeInMonths(1, nextRenewal.time)
		await expect(paidUntil).toBeInYears(2)
	}
}

export const secondRenewal = async () => {
	await screenMenu.subscription().click()
	await expect(homeView.currentSubscriptionSku()).not.toBeEmpty()
	const isMonthly = (await homeView.currentSubscriptionSku().inputValue()) === 'ABO-001-M'
	if (!isMonthly) {
		await expect(homeView.currentSubscriptionSku()).toHaveValue('ABO-001-Y')
	}

	await mail.hideTagged(config.testId)
	expect(await mail.list(config.testId)).toHaveLength(0)

	await orch.triggerNextRenewalsFor(username)
	let message = await mail.waitForSubjectToInclude('will renew soon', config.testId)
	expect(message.Attachments).toHaveLength(0)

	await orch.triggerNextRenewalsFor(username)
	message = await mail.waitForSubjectToInclude('has been renewed', config.testId)
	expect(message.Attachments).toHaveLength(1)
	await orch.triggerRenewals()

	await reloadApp()
	await expect(homeView.currentSubscriptionPaidUntil()).not.toBeEmpty()
	const paidUntil = new Date((await homeView.currentSubscriptionPaidUntil().inputValue()) ?? '')
	const nextRenewal = await orch.nextRenewalDate(username)

	if (isMonthly) {
		await expect(paidUntil).toBeInWeeks(1, nextRenewal.time)
		await expect(paidUntil).toBeInMonths(3)
	} else {
		await expect(paidUntil).toBeInMonths(1, nextRenewal.time)
		await expect(paidUntil).toBeInYears(3)
	}
}

export const retryRenewal = async () => {
	await screenMenu.subscription().click()
	await expect(homeView.currentSubscriptionSku()).not.toBeEmpty()
	const isMonthly = (await homeView.currentSubscriptionSku().inputValue()) === 'ABO-001-M'
	if (!isMonthly) {
		await expect(homeView.currentSubscriptionSku()).toHaveValue('ABO-001-Y')
	}

	let message = await mail.waitForSubjectToInclude('has been created', config.testId)
	expect(message.Attachments).toHaveLength(1)
	await mail.hideTagged(config.testId)
	expect(await mail.list(config.testId)).toHaveLength(0)

	await orch.triggerRenewals()
	await orch.triggerNextRenewalsFor(username)
	message = await mail.waitForSubjectToInclude('will renew soon', config.testId)
	expect(message.Attachments).toHaveLength(0)

	await reloadApp()
	await expect(homeView.currentSubscriptionPaidUntil()).not.toBeEmpty()
	let paidUntil = new Date((await homeView.currentSubscriptionPaidUntil().inputValue()) ?? '')
	let nextRenewal = await orch.nextRenewalDate(username)
	expect((await nextRenewal).action).toBe('auto-renew')
	await expect(paidUntil).toBeInHours(1, nextRenewal.time)

	expect(await mail.list(config.testId)).toHaveLength(1)
	await orch.failNextCharge('500')
	await orch.triggerNextRenewalsFor(username)
	expect(await mail.list(config.testId)).toHaveLength(1)

	nextRenewal = await orch.nextRenewalDate(username)
	expect((await nextRenewal).action).toBe('retry-payment')
	await expect(nextRenewal.time).toBeInHours(5, paidUntil)

	await orch.triggerNextRenewalsFor(username)
	message = await mail.waitForSubjectToInclude('has been renewed', config.testId)
	expect(message.Attachments).toHaveLength(1)
	expect(await mail.list(config.testId)).toHaveLength(2)

	await orch.triggerRenewals()

	await reloadApp()
	await expect(homeView.currentSubscriptionPaidUntil()).not.toBeEmpty()
	paidUntil = new Date((await homeView.currentSubscriptionPaidUntil().inputValue()) ?? '')
	nextRenewal = await orch.nextRenewalDate(username)
	if (isMonthly) {
		await expect(paidUntil).toBeInWeeks(1, nextRenewal.time)
		await expect(paidUntil).toBeInMonths(2)
	} else {
		await expect(paidUntil).toBeInMonths(1, nextRenewal.time)
		await expect(paidUntil).toBeInYears(2)
	}
}

export const retryRenewalTwice = async () => {
	await screenMenu.subscription().click()
	await expect(homeView.currentSubscriptionSku()).not.toBeEmpty()
	const isMonthly = (await homeView.currentSubscriptionSku().inputValue()) === 'ABO-001-M'
	if (!isMonthly) {
		await expect(homeView.currentSubscriptionSku()).toHaveValue('ABO-001-Y')
	}
	let message = await mail.waitForSubjectToInclude('has been created', config.testId)
	expect(message.Attachments).toHaveLength(1)
	await mail.hideTagged(config.testId)
	expect(await mail.list(config.testId)).toHaveLength(0)

	await orch.triggerRenewals()
	await orch.triggerNextRenewalsFor(username)
	message = await mail.waitForSubjectToInclude('will renew soon', config.testId)
	expect(message.Attachments).toHaveLength(0)

	await reloadApp()
	await expect(homeView.currentSubscriptionPaidUntil()).not.toBeEmpty()
	let paidUntil = new Date((await homeView.currentSubscriptionPaidUntil().inputValue()) ?? '')
	let nextRenewal = await orch.nextRenewalDate(username)
	expect((await nextRenewal).action).toBe('auto-renew')
	await expect(paidUntil).toBeInHours(1, nextRenewal.time)

	expect(await mail.list(config.testId)).toHaveLength(1)
	await orch.failNextCharge('500')
	await orch.triggerNextRenewalsFor(username)
	expect(await mail.list(config.testId)).toHaveLength(1)

	nextRenewal = await orch.nextRenewalDate(username)
	expect((await nextRenewal).action).toBe('retry-payment')
	await expect(nextRenewal.time).toBeInHours(5, paidUntil)

	await orch.failNextCharge('500')
	await orch.triggerNextRenewalsFor(username)
	expect(await mail.list(config.testId)).toHaveLength(1)

	nextRenewal = await orch.nextRenewalDate(username)
	expect((await nextRenewal).action).toBe('retry-payment-again')
	await expect(nextRenewal.time).toBeInDays(1, paidUntil)

	await orch.triggerNextRenewalsFor(username)
	message = await mail.waitForSubjectToInclude('has been renewed', config.testId)
	expect(message.Attachments).toHaveLength(1)
	expect(await mail.list(config.testId)).toHaveLength(2)

	await orch.triggerRenewals()

	await reloadApp()
	await expect(homeView.currentSubscriptionPaidUntil()).not.toBeEmpty()
	paidUntil = new Date((await homeView.currentSubscriptionPaidUntil().inputValue()) ?? '')
	nextRenewal = await orch.nextRenewalDate(username)
	if (isMonthly) {
		await expect(paidUntil).toBeInWeeks(1, nextRenewal.time)
		await expect(paidUntil).toBeInMonths(2)
	} else {
		await expect(paidUntil).toBeInMonths(1, nextRenewal.time)
		await expect(paidUntil).toBeInYears(2)
	}
}

export const failRenewal = async () => {
	await screenMenu.subscription().click()
	let message = await mail.waitForSubjectToInclude('has been created', config.testId)

	expect(message.Attachments).toHaveLength(1)
	await mail.hideTagged(config.testId)
	expect(await mail.list(config.testId)).toHaveLength(0)

	await orch.triggerRenewals()
	await orch.triggerNextRenewalsFor(username)
	message = await mail.waitForSubjectToInclude('will renew soon', config.testId)
	expect(message.Attachments).toHaveLength(0)

	await reloadApp()
	await expect(homeView.currentSubscriptionPaidUntil()).not.toBeEmpty()
	const paidUntil = new Date((await homeView.currentSubscriptionPaidUntil().inputValue()) ?? '')
	let nextRenewal = await orch.nextRenewalDate(username)
	expect((await nextRenewal).action).toBe('auto-renew')
	await expect(paidUntil).toBeInHours(1, nextRenewal.time)

	expect(await mail.list(config.testId)).toHaveLength(1)
	await orch.failNextCharge('500')
	await orch.triggerNextRenewalsFor(username)
	expect(await mail.list(config.testId)).toHaveLength(1)

	nextRenewal = await orch.nextRenewalDate(username)
	expect((await nextRenewal).action).toBe('retry-payment')
	await expect(nextRenewal.time).toBeInHours(5, paidUntil)

	await orch.failNextCharge('500')
	await orch.triggerNextRenewalsFor(username)
	expect(await mail.list(config.testId)).toHaveLength(1)

	nextRenewal = await orch.nextRenewalDate(username)
	expect((await nextRenewal).action).toBe('retry-payment-again')
	await expect(nextRenewal.time).toBeInDays(1, paidUntil)

	await orch.failNextCharge('500')
	await orch.triggerNextRenewalsFor(username)
	expect(await mail.list(config.testId)).toHaveLength(1)

	nextRenewal = await orch.nextRenewalDate(username)
	expect((await nextRenewal).action).toBe('verify-payment-failed')
	await expect(nextRenewal.time).toBeInHours(29, paidUntil)
	await orch.triggerNextRenewalsFor(username)

	await mail.waitForSubjectToInclude('payment failed', config.testId)

	nextRenewal = await orch.nextRenewalDate(username)
	expect((await nextRenewal).action).toBe('warn-grace-ending')
	await expect(nextRenewal.time).toBeInWeeks(1, paidUntil)

	await setNow(nextRenewal.time)

	await expect(subItem.overdue()).toBeVisible()
	await expect(subItem.payNow()).toBeVisible()
	await expect(subItem.renewsAutomatically()).not.toBeVisible()

	await setNow(nextRenewal.time)
	await screenMenu.invoices().click()
	await expect(invoiceItem.statusOverdue(10328)).toBeVisible()
	await expect(invoiceItem.payNow(10328)).toBeVisible()
}

export const recoverFromHome = async () => {
	await screenMenu.subscription().click()
	let nextRenewal = await orch.nextRenewalDate(username)
	await setNow(nextRenewal.time)
	await expect(homeView.currentSubscriptionSku()).not.toBeEmpty()
	const isMonthly = (await homeView.currentSubscriptionSku().inputValue()) === 'ABO-001-M'
	if (!isMonthly) {
		await expect(homeView.currentSubscriptionSku()).toHaveValue('ABO-001-Y')
	}
	await expect(subItem.overdue()).toBeVisible()
	await expect(subItem.payNow()).toBeVisible()
	await expect(subItem.renewsAutomatically()).not.toBeVisible()
	await subItem.payNow().click()
	await paymentSelector.new().click()
	await expect(payInvoiceView.container()).toBeVisible()
	await payInvoiceView.acceptTerms().click()
	await payInvoiceView.acceptPrivacy().click()
	pwState.expectTab(config.payUrl)
	await payInvoiceView.payButton().click()
	await executePayment()
	await expect(invoicesView.container()).toBeVisible()
	await setNow(nextRenewal.time)
	await expect(homeView.container()).toBeVisible()
	await expect(subItem.overdue()).not.toBeVisible()
	await expect(subItem.payNow()).not.toBeVisible()
	await expect(subItem.renewsAutomatically()).toBeVisible()

	await mail.waitForSubjectToInclude('has been renewed', config.testId)

	await orch.triggerRenewals()

	await expect(homeView.currentSubscriptionPaidUntil()).not.toBeEmpty()
	const paidUntil = new Date((await homeView.currentSubscriptionPaidUntil().inputValue()) ?? '')
	nextRenewal = await orch.nextRenewalDate(username)

	if (isMonthly) {
		await expect(paidUntil).toBeInWeeks(1, nextRenewal.time)
		await expect(paidUntil).toBeInMonths(2)
	} else {
		await expect(paidUntil).toBeInMonths(1, nextRenewal.time)
		await expect(paidUntil).toBeInYears(2)
	}
}

export const recoverFromInvoices = async () => {
	await screenMenu.subscription().click()
	let nextRenewal = await orch.nextRenewalDate(username)
	await setNow(nextRenewal.time)
	await expect(homeView.currentSubscriptionSku()).not.toBeEmpty()
	const isMonthly = (await homeView.currentSubscriptionSku().inputValue()) === 'ABO-001-M'
	if (!isMonthly) {
		await expect(homeView.currentSubscriptionSku()).toHaveValue('ABO-001-Y')
	}
	nextRenewal = await orch.nextRenewalDate(username)
	await setNow(nextRenewal.time)
	await screenMenu.invoices().click()
	await expect(invoiceItem.statusOverdue(10328)).toBeVisible()
	await expect(invoiceItem.payNow(10328)).toBeVisible()
	await invoiceItem.payNow(10328).click()
	await paymentSelector.new().click()
	await expect(payInvoiceView.container()).toBeVisible()
	await payInvoiceView.acceptTerms().click()
	await payInvoiceView.acceptPrivacy().click()
	pwState.expectTab(config.payUrl)
	await payInvoiceView.payButton().click()
	await executePayment()
	await expect(invoicesView.container()).toBeVisible()
	await expect(invoiceItem.statusOverdue(10328)).not.toBeVisible()
	await expect(invoiceItem.payNow(10328)).not.toBeVisible()
	await expect(invoiceItem.statusPaid(10328)).toBeVisible()

	await mail.waitForSubjectToInclude('has been renewed', config.testId)

	await orch.triggerRenewals()

	await screenMenu.subscription().click()
	await expect(homeView.currentSubscriptionPaidUntil()).not.toBeEmpty()
	const paidUntil = new Date((await homeView.currentSubscriptionPaidUntil().inputValue()) ?? '')
	nextRenewal = await orch.nextRenewalDate(username)

	if (isMonthly) {
		await expect(paidUntil).toBeInWeeks(1, nextRenewal.time)
		await expect(paidUntil).toBeInMonths(2)
	} else {
		await expect(paidUntil).toBeInMonths(1, nextRenewal.time)
		await expect(paidUntil).toBeInYears(2)
	}
}

export const failRenewalNoMethods = async () => {
	await screenMenu.subscription().click()
	await expect(homeView.currentSubscriptionPaidUntil()).not.toBeEmpty()
	const paidUntil = new Date((await homeView.currentSubscriptionPaidUntil().inputValue()) ?? '')
	let message = await mail.waitForSubjectToInclude('has been created', config.testId)
	expect(message.Attachments).toHaveLength(1)
	await mail.hideTagged(config.testId)
	expect(await mail.list(config.testId)).toHaveLength(0)
	await orch.triggerRenewals()

	await screenMenu.methods().click()
	await expect(paymentMethodsView.container()).toBeVisible()
	await expect(paymentMethodsView.card4242()).toBeVisible()
	await paymentMethodsView.card4242Delete().click()
	await expect(paymentMethodsView.card4242()).not.toBeVisible()

	await orch.triggerNextRenewalsFor(username)
	message = await mail.waitForSubjectToInclude('will renew soon', config.testId)
	expect(message.Attachments).toHaveLength(0)

	let nextRenewal = await orch.nextRenewalDate(username)
	expect((await nextRenewal).action).toBe('auto-renew')
	await expect(paidUntil).toBeInHours(1, nextRenewal.time)

	await orch.triggerNextRenewalsFor(username)

	nextRenewal = await orch.nextRenewalDate(username)
	expect((await nextRenewal).action).toBe('verify-payment-failed')
	await expect(paidUntil).toBeInHours(1, nextRenewal.time)

	await orch.triggerNextRenewalsFor(username)
	message = await mail.waitForSubjectToInclude('payment failed', config.testId)
	expect(await mail.list(config.testId)).toHaveLength(2)

	const prevRenewal = nextRenewal
	nextRenewal = await orch.nextRenewalDate(username)
	expect((await nextRenewal).action).toBe('warn-grace-ending')
	await expect(nextRenewal.time).toBeInWeeks(1, prevRenewal.time)

	await setNow(nextRenewal.time)

	await expect(subItem.overdue()).toBeVisible()
	await expect(subItem.payNow()).toBeVisible()
	await expect(subItem.renewsAutomatically()).not.toBeVisible()

	await setNow(nextRenewal.time)
	await screenMenu.invoices().click()
	await expect(invoiceItem.statusOverdue(10328)).toBeVisible()
	await expect(subItem.renewsAutomatically()).not.toBeVisible()
}

export const cancelSubscription = async () => {
	const message = await mail.waitForSubjectToInclude('has been created', config.testId)
	expect(message.Attachments).toHaveLength(1)
	await mail.hideTagged(config.testId)
	expect(await mail.list(config.testId)).toHaveLength(0)
	await orch.triggerRenewals()

	await screenMenu.subscription().click()
	await expect(homeView.currentSubscriptionPaidUntil()).not.toBeEmpty()
	const paidUntil = new Date((await homeView.currentSubscriptionPaidUntil().inputValue()) ?? '')

	await expect(subItem.yearlyCancel(1)).toBeVisible()
	await subItem.yearlyCancel(1).click()
	await expect(subItem.ends()).toBeVisible()
	await orch.triggerRenewals()
	await orch.triggerNextRenewalsFor(username)
	let nextRenewal = await orch.nextRenewalDate(username)
	expect((await nextRenewal).action).toBe('end-subscription')
	await expect(nextRenewal.time).toBeInDays(1, paidUntil)

	await orch.triggerNextRenewalsFor(username)
	nextRenewal = await orch.nextRenewalDate(username)
	expect((await nextRenewal).action).toBe('none')
	await expect(nextRenewal.time).toBeInDays(0, NEVER)
	await reloadApp()
}

export const failRenewalDeclined = async () => {
	await screenMenu.subscription().click()
	let message = await mail.waitForSubjectToInclude('has been created', config.testId)
	expect(message.Attachments).toHaveLength(1)
	await mail.hideTagged(config.testId)
	expect(await mail.list(config.testId)).toHaveLength(0)

	await orch.triggerRenewals()
	await orch.triggerNextRenewalsFor(username)
	message = await mail.waitForSubjectToInclude('will renew soon', config.testId)
	expect(message.Attachments).toHaveLength(0)

	await reloadApp()
	await expect(homeView.currentSubscriptionPaidUntil()).not.toBeEmpty()
	const paidUntil = new Date((await homeView.currentSubscriptionPaidUntil().inputValue()) ?? '')
	let nextRenewal = await orch.nextRenewalDate(username)
	expect((await nextRenewal).action).toBe('auto-renew')
	await expect(paidUntil).toBeInHours(1, nextRenewal.time)

	expect(await mail.list(config.testId)).toHaveLength(1)
	await orch.failNextCharge('decline')
	await orch.triggerNextRenewalsFor(username)
	expect(await mail.list(config.testId)).toHaveLength(1)

	nextRenewal = await orch.nextRenewalDate(username)
	expect((await nextRenewal).action).toBe('retry-payment-again')
	await expect(nextRenewal.time).toBeInDays(1, paidUntil)

	await orch.failNextCharge('decline')
	await orch.triggerNextRenewalsFor(username)
	expect(await mail.list(config.testId)).toHaveLength(1)

	nextRenewal = await orch.nextRenewalDate(username)
	expect((await nextRenewal).action).toBe('verify-payment-failed')
	await expect(nextRenewal.time).toBeInHours(29, paidUntil)
	await orch.triggerNextRenewalsFor(username)

	await mail.waitForSubjectToInclude('payment failed', config.testId)

	nextRenewal = await orch.nextRenewalDate(username)
	expect((await nextRenewal).action).toBe('warn-grace-ending')
	await expect(nextRenewal.time).toBeInWeeks(1, paidUntil)

	await setNow(nextRenewal.time)
	await expect(subItem.overdue()).toBeVisible()
	await expect(subItem.payNow()).toBeVisible()
	await expect(subItem.renewsAutomatically()).not.toBeVisible()

	await setNow(nextRenewal.time)
	await screenMenu.invoices().click()
	await expect(invoiceItem.statusOverdue(10328)).toBeVisible()
	await expect(invoiceItem.payNow(10328)).toBeVisible()
}

export const ignoreRenewalFailure = async () => {
	let nextRenewal = await orch.nextRenewalDate(username)
	await setNow(nextRenewal.time)
	await expect(homeView.currentSubscriptionPaidUntil()).not.toBeEmpty()
	await expect(homeView.currentSubscriptionSku()).not.toBeEmpty()
	const paidUntil = new Date((await homeView.currentSubscriptionPaidUntil().inputValue()) ?? '')
	const isMonthly = (await homeView.currentSubscriptionSku().inputValue()) === 'ABO-001-M'
	if (!isMonthly) {
		await expect(homeView.currentSubscriptionSku()).toHaveValue('ABO-001-Y')
	}
	expect((await nextRenewal).action).toBe('warn-grace-ending')

	await expect(subItem.overdue()).toBeVisible()
	await expect(subItem.payNow()).toBeVisible()
	await expect(subItem.renewsAutomatically()).not.toBeVisible()
	await orch.triggerNextRenewalsFor(username)
	await mail.waitForSubjectToInclude('will be suspended soon', config.testId)

	nextRenewal = await orch.nextRenewalDate(username)
	expect((await nextRenewal).action).toBe('grace-ended')
	await expect(nextRenewal.time).toBeInWeeks(2, paidUntil)

	await orch.triggerNextRenewalsFor(username)
	await mail.waitForSubjectToInclude('has been suspended', config.testId)
	nextRenewal = await orch.nextRenewalDate(username)
	expect((await nextRenewal).action).toBe('warn-suspension-ending')
	await expect(nextRenewal.time).toBeInWeeks(6, paidUntil)

	await orch.triggerNextRenewalsFor(username)
	await mail.waitForSubjectToInclude('is suspended and will be cancelled soon', config.testId)
	nextRenewal = await orch.nextRenewalDate(username)
	expect((await nextRenewal).action).toBe('suspension-ended')
	await expect(nextRenewal.time).toBeInWeeks(12, paidUntil)

	await orch.triggerNextRenewalsFor(username)
	await mail.waitForSubjectToInclude('has been cancelled', config.testId)
	nextRenewal = await orch.nextRenewalDate(username)
	expect((await nextRenewal).action).toBe('none')
	await expect(nextRenewal.time).toBeInDays(0, NEVER)
}
