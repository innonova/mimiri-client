import { executePayment, reloadApp } from './actions'
import { mail, orch } from './clients'
import { config, username } from './data'
import { expect } from './fixtures'
import { pwState } from './pw-state'
import { homeView, newSubView, paymentSelector, screenMenu, subItem, upgradeView } from './selectors'

export const upgradeSubscription = async () => {
	await mail.hideTagged(config.testId)
	await screenMenu.subscription().click()
	await expect(homeView.container()).toBeVisible()
	await expect(subItem.yearlyChange(1)).toBeVisible()
	await subItem.yearlyChange(1).click()
	await expect(subItem.yearlyChangeTo(2)).toBeVisible()
	await subItem.yearlyChangeTo(2).click()
	await expect(upgradeView.container()).toBeVisible()
	await upgradeView.acceptTerms().click()
	await upgradeView.acceptPrivacy().click()

	if (await paymentSelector.container().isVisible()) {
		await expect(paymentSelector.new()).toBeVisible()
		await paymentSelector.new().click()
	}

	pwState.expectTab(config.payUrl)
	await upgradeView.payButton().click()
	await executePayment()
	await expect(homeView.container()).toBeVisible()
	await expect(subItem.yearly(2)).toBeVisible()
	await orch.triggerRenewals()
	await mail.waitForSubjectToInclude('has been renewed', config.testId)

	await reloadApp()
	await expect(homeView.currentSubscriptionPaidUntil()).not.toBeEmpty()
	const paidUntil = new Date((await homeView.currentSubscriptionPaidUntil().inputValue()) ?? '')
	const nextRenewal = await orch.nextRenewalDate(username)
	expect((await nextRenewal).action).toBe('notify-will-renew')

	await expect(paidUntil).toBeInMonths(1, nextRenewal.time)
	await expect(paidUntil).toBeInMonths(12 + 6)
}

export const downgradeSubscription = async () => {
	await mail.hideTagged(config.testId)
	await screenMenu.subscription().click()
	await expect(homeView.container()).toBeVisible()
	await expect(subItem.yearlyChange(2)).toBeVisible()
	await subItem.yearlyChange(2).click()
	await expect(subItem.yearlyChangeTo(1)).toBeVisible()
	await subItem.yearlyChangeTo(1).click()
	await expect(upgradeView.container()).toBeVisible()
	await upgradeView.acceptTerms().click()
	await upgradeView.acceptPrivacy().click()

	if (await paymentSelector.container().isVisible()) {
		await expect(paymentSelector.new()).toBeVisible()
		await paymentSelector.new().click()
	}

	pwState.expectTab(config.payUrl)
	await upgradeView.payButton().click()
	await executePayment()
	await expect(homeView.container()).toBeVisible()
	await expect(subItem.yearly(1)).toBeVisible()
	await orch.triggerRenewals()
	await mail.waitForSubjectToInclude('has been renewed', config.testId)

	await reloadApp()
	await expect(homeView.currentSubscriptionPaidUntil()).not.toBeEmpty()
	const paidUntil = new Date((await homeView.currentSubscriptionPaidUntil().inputValue()) ?? '')
	const nextRenewal = await orch.nextRenewalDate(username)
	expect((await nextRenewal).action).toBe('notify-will-renew')

	await expect(paidUntil).toBeInMonths(1, nextRenewal.time)
	await expect(paidUntil).toBeInMonths(18 * 2 + 12)
}

export const changePeriodToMonthly = async () => {
	await mail.hideTagged(config.testId)
	await screenMenu.subscription().click()
	await expect(homeView.container()).toBeVisible()
	await expect(subItem.yearlyChange(1)).toBeVisible()
	await subItem.yearlyChange(1).click()
	await newSubView.monthly().click()
	await subItem.monthlyChangeTo(1).click()
	await expect(upgradeView.container()).toBeVisible()
	await upgradeView.acceptTerms().click()
	await upgradeView.acceptPrivacy().click()

	if (await paymentSelector.container().isVisible()) {
		await expect(paymentSelector.new()).toBeVisible()
		await paymentSelector.new().click()
	}

	pwState.expectTab(config.payUrl)
	await upgradeView.payButton().click()
	await executePayment()
	await expect(homeView.container()).toBeVisible()
	await expect(subItem.monthly(1)).toBeVisible()
	await orch.triggerRenewals()
	await mail.waitForSubjectToInclude('has been renewed', config.testId)

	await reloadApp()
	await expect(homeView.currentSubscriptionPaidUntil()).not.toBeEmpty()
	const paidUntil = new Date((await homeView.currentSubscriptionPaidUntil().inputValue()) ?? '')
	const nextRenewal = await orch.nextRenewalDate(username)
	expect((await nextRenewal).action).toBe('notify-will-renew')

	await expect(paidUntil).toBeInWeeks(1, nextRenewal.time)
	await expect(paidUntil).toBeInMonths(13)
}

export const changePeriodToYearly = async () => {
	await mail.hideTagged(config.testId)
	await screenMenu.subscription().click()
	await expect(homeView.container()).toBeVisible()
	await expect(subItem.monthlyChange(1)).toBeVisible()
	await subItem.monthlyChange(1).click()
	await newSubView.yearly().click()
	await subItem.yearlyChangeTo(1).click()
	await expect(upgradeView.container()).toBeVisible()
	await upgradeView.acceptTerms().click()
	await upgradeView.acceptPrivacy().click()

	if (await paymentSelector.container().isVisible()) {
		await expect(paymentSelector.new()).toBeVisible()
		await paymentSelector.new().click()
	}

	pwState.expectTab(config.payUrl)
	await upgradeView.payButton().click()
	await executePayment()
	await expect(homeView.container()).toBeVisible()
	await expect(subItem.yearly(1)).toBeVisible()
	await orch.triggerRenewals()
	await mail.waitForSubjectToInclude('has been renewed', config.testId)

	await reloadApp()
	await expect(homeView.currentSubscriptionPaidUntil()).not.toBeEmpty()
	const paidUntil = new Date((await homeView.currentSubscriptionPaidUntil().inputValue()) ?? '')
	const nextRenewal = await orch.nextRenewalDate(username)
	expect((await nextRenewal).action).toBe('notify-will-renew')

	await expect(paidUntil).toBeInMonths(1, nextRenewal.time)
	await expect(paidUntil).toBeInMonths(25)
}

export const changePeriodAndTier = async () => {
	await mail.hideTagged(config.testId)
	await screenMenu.subscription().click()
	await expect(homeView.currentSubscriptionSku()).not.toBeEmpty()
	const isMonthlyInitially = (await homeView.currentSubscriptionSku().inputValue()) === 'ABO-001-M'
	if (!isMonthlyInitially) {
		await expect(homeView.currentSubscriptionSku()).toHaveValue('ABO-001-Y')
	}
	await expect(homeView.container()).toBeVisible()
	if (isMonthlyInitially) {
		await expect(subItem.monthlyChange(1)).toBeVisible()
		await subItem.monthlyChange(1).click()
		await newSubView.yearly().click()
		await subItem.yearlyChangeTo(2).click()
	} else {
		await expect(subItem.yearlyChange(1)).toBeVisible()
		await subItem.yearlyChange(1).click()
		await newSubView.monthly().click()
		await subItem.monthlyChangeTo(2).click()
	}
	await expect(upgradeView.container()).toBeVisible()
	await upgradeView.acceptTerms().click()
	await upgradeView.acceptPrivacy().click()

	if (await paymentSelector.container().isVisible()) {
		await expect(paymentSelector.new()).toBeVisible()
		await paymentSelector.new().click()
	}

	pwState.expectTab(config.payUrl)
	await upgradeView.payButton().click()
	await executePayment()
	await expect(homeView.container()).toBeVisible()
	if (isMonthlyInitially) {
		await expect(subItem.yearly(2)).toBeVisible()
	} else {
		await expect(subItem.monthly(2)).toBeVisible()
	}
	await orch.triggerRenewals()
	await mail.waitForSubjectToInclude('has been renewed', config.testId)

	await reloadApp()
	await expect(homeView.currentSubscriptionPaidUntil()).not.toBeEmpty()
	const paidUntil = new Date((await homeView.currentSubscriptionPaidUntil().inputValue()) ?? '')
	const nextRenewal = await orch.nextRenewalDate(username)
	expect((await nextRenewal).action).toBe('notify-will-renew')
	if (isMonthlyInitially) {
		await expect(paidUntil).toBeInMonths(1, nextRenewal.time)
		await expect(paidUntil).toBeInMonths(12.5)
	} else {
		await expect(paidUntil).toBeInWeeks(1, nextRenewal.time)
		await expect(paidUntil).toBeInMonths(6)
	}
}
