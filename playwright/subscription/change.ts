import { executePayment, reloadApp } from './actions'
import { expect } from '../framework/fixtures'
import { subHomeView, newSubView, paymentSelector, settingNodes, subItem, upgradeView } from '../selectors'
import { mimiri } from '../framework/mimiri-context'

export const upgradeSubscription = async () => {
	await mimiri().deleteTagged()
	await settingNodes.subscription().click()
	await expect(subHomeView.container()).toBeVisible()
	await expect(subItem.yearlyChange(1)).toBeVisible()
	await subItem.yearlyChange(1).click()
	await expect(subItem.yearlyChangeTo(2)).toBeVisible()
	await subItem.yearlyChangeTo(2).click()
	await expect(upgradeView.container()).toBeVisible()
	await upgradeView.acceptTerms().click()
	await upgradeView.acceptPrivacy().click()

	await expect(paymentSelector.new()).toBeVisible()
	await paymentSelector.new().click()

	await expect(upgradeView.payButton()).toBeEnabled()
	mimiri().expectTab(mimiri().config.payUrl)
	await upgradeView.payButton().click()
	await executePayment()
	await expect(subHomeView.container()).toBeVisible()
	await expect(subItem.yearly(2)).toBeVisible()
	await mimiri().triggerRenewals()
	await mimiri().waitForSubjectToInclude('has been renewed')

	await reloadApp()
	await expect(subHomeView.currentSubscriptionPaidUntil()).not.toBeEmpty()
	const paidUntil = new Date((await subHomeView.currentSubscriptionPaidUntil().inputValue()) ?? '')
	const nextRenewal = await mimiri().nextRenewalDate()
	expect((await nextRenewal).action).toBe('notify-will-renew')

	await expect(paidUntil).toBeInMonths(1, nextRenewal.time)
	await expect(paidUntil).toBeInMonths(12 + 6)
}

export const downgradeSubscription = async () => {
	await mimiri().deleteTagged()
	await settingNodes.subscription().click()
	await expect(subHomeView.container()).toBeVisible()
	await expect(subItem.yearlyChange(2)).toBeVisible()
	await subItem.yearlyChange(2).click()
	await expect(subItem.yearlyChangeTo(1)).toBeVisible()
	await subItem.yearlyChangeTo(1).click()
	await expect(upgradeView.container()).toBeVisible()
	await upgradeView.acceptTerms().click()
	await upgradeView.acceptPrivacy().click()

	await expect(paymentSelector.new()).toBeVisible()
	await paymentSelector.new().click()

	await expect(upgradeView.payButton()).toBeEnabled()
	mimiri().expectTab(mimiri().config.payUrl)
	await upgradeView.payButton().click()
	await executePayment()
	await expect(subHomeView.container()).toBeVisible()
	await expect(subHomeView.currentSubscriptionSku()).toHaveValue('ABO-001-Y')
	await expect(subItem.yearly(1)).toBeVisible()
	await mimiri().triggerRenewals()
	await mimiri().waitForSubjectToInclude('has been renewed')

	await reloadApp()
	await expect(subHomeView.currentSubscriptionPaidUntil()).not.toBeEmpty()
	const paidUntil = new Date((await subHomeView.currentSubscriptionPaidUntil().inputValue()) ?? '')
	const nextRenewal = await mimiri().nextRenewalDate()
	expect((await nextRenewal).action).toBe('notify-will-renew')

	await expect(paidUntil).toBeInMonths(1, nextRenewal.time)
	await expect(paidUntil).toBeInMonths(18 * 2 + 12)
}

export const changePeriodToMonthly = async () => {
	await mimiri().deleteTagged()
	await settingNodes.subscription().click()
	await expect(subHomeView.container()).toBeVisible()
	await expect(subItem.yearlyChange(1)).toBeVisible()
	await subItem.yearlyChange(1).click()
	await expect(newSubView.loaded()).toHaveValue('true')
	await newSubView.monthly().click()
	await subItem.monthlyChangeTo(1).click()
	await expect(upgradeView.container()).toBeVisible()
	await upgradeView.acceptTerms().click()
	await upgradeView.acceptPrivacy().click()

	await expect(paymentSelector.new()).toBeVisible()
	await paymentSelector.new().click()

	await expect(upgradeView.payButton()).toBeEnabled()
	mimiri().expectTab(mimiri().config.payUrl)
	await upgradeView.payButton().click()
	await executePayment()
	await expect(subHomeView.container()).toBeVisible()
	await expect(subHomeView.currentSubscriptionSku()).toHaveValue('ABO-001-M')
	await expect(subItem.monthly(1)).toBeVisible()
	await mimiri().triggerRenewals()
	await mimiri().waitForSubjectToInclude('has been renewed')

	await reloadApp()
	await expect(subHomeView.currentSubscriptionPaidUntil()).not.toBeEmpty()
	const paidUntil = new Date((await subHomeView.currentSubscriptionPaidUntil().inputValue()) ?? '')
	const nextRenewal = await mimiri().nextRenewalDate()
	expect((await nextRenewal).action).toBe('notify-will-renew')

	await expect(paidUntil).toBeInWeeks(1, nextRenewal.time)
	await expect(paidUntil).toBeInMonths(13)
}

export const changePeriodToYearly = async () => {
	await mimiri().deleteTagged()
	await settingNodes.subscription().click()
	await expect(subHomeView.container()).toBeVisible()
	await expect(subItem.monthlyChange(1)).toBeVisible()
	await subItem.monthlyChange(1).click()
	await expect(newSubView.loaded()).toHaveValue('true')
	await newSubView.yearly().click()
	await subItem.yearlyChangeTo(1).click()
	await expect(upgradeView.container()).toBeVisible()
	await upgradeView.acceptTerms().click()
	await upgradeView.acceptPrivacy().click()

	await expect(paymentSelector.new()).toBeVisible()
	await paymentSelector.new().click()

	await expect(upgradeView.payButton()).toBeEnabled()
	mimiri().expectTab(mimiri().config.payUrl)
	await upgradeView.payButton().click()
	await executePayment()
	await expect(subHomeView.container()).toBeVisible()
	await expect(subHomeView.currentSubscriptionSku()).toHaveValue('ABO-001-Y')
	await expect(subItem.yearly(1)).toBeVisible()
	await mimiri().triggerRenewals()
	await mimiri().waitForSubjectToInclude('has been renewed')

	await reloadApp()
	await expect(subHomeView.currentSubscriptionPaidUntil()).not.toBeEmpty()
	const paidUntil = new Date((await subHomeView.currentSubscriptionPaidUntil().inputValue()) ?? '')
	const nextRenewal = await mimiri().nextRenewalDate()
	expect((await nextRenewal).action).toBe('notify-will-renew')

	await expect(paidUntil).toBeInMonths(1, nextRenewal.time)
	await expect(paidUntil).toBeInMonths(25)
}

export const changePeriodAndTier = async () => {
	await mimiri().deleteTagged()
	await settingNodes.subscription().click()
	await expect(subHomeView.currentSubscriptionSku()).not.toBeEmpty()
	const isMonthlyInitially = (await subHomeView.currentSubscriptionSku().inputValue()) === 'ABO-001-M'
	if (!isMonthlyInitially) {
		await expect(subHomeView.currentSubscriptionSku()).toHaveValue('ABO-001-Y')
	}
	await expect(subHomeView.container()).toBeVisible()
	if (isMonthlyInitially) {
		await expect(subItem.monthlyChange(1)).toBeVisible()
		await subItem.monthlyChange(1).click()
		await expect(newSubView.loaded()).toHaveValue('true')
		await newSubView.yearly().click()
		await subItem.yearlyChangeTo(2).click()
	} else {
		await expect(subItem.yearlyChange(1)).toBeVisible()
		await subItem.yearlyChange(1).click()
		await expect(newSubView.loaded()).toHaveValue('true')
		await newSubView.monthly().click()
		await subItem.monthlyChangeTo(2).click()
	}
	await expect(upgradeView.container()).toBeVisible()
	await upgradeView.acceptTerms().click()
	await upgradeView.acceptPrivacy().click()

	await expect(paymentSelector.loaded()).toHaveValue('true')
	if (await paymentSelector.container().isVisible()) {
		await expect(paymentSelector.new()).toBeVisible()
		await paymentSelector.new().click()
	}

	await expect(upgradeView.payButton()).toBeEnabled()
	mimiri().expectTab(mimiri().config.payUrl)
	await upgradeView.payButton().click()
	await executePayment()
	await expect(subHomeView.container()).toBeVisible()
	if (isMonthlyInitially) {
		await expect(subItem.yearly(2)).toBeVisible()
	} else {
		await expect(subItem.monthly(2)).toBeVisible()
	}
	await mimiri().triggerRenewals()
	await mimiri().waitForSubjectToInclude('has been renewed')

	await reloadApp()
	await expect(subHomeView.currentSubscriptionPaidUntil()).not.toBeEmpty()
	const paidUntil = new Date((await subHomeView.currentSubscriptionPaidUntil().inputValue()) ?? '')
	const nextRenewal = await mimiri().nextRenewalDate()
	expect((await nextRenewal).action).toBe('notify-will-renew')
	if (isMonthlyInitially) {
		await expect(paidUntil).toBeInMonths(1, nextRenewal.time)
		await expect(paidUntil).toBeInMonths(12.5)
	} else {
		await expect(paidUntil).toBeInWeeks(1, nextRenewal.time)
		await expect(paidUntil).toBeInMonths(6)
	}
}
