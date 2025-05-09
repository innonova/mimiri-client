import {
	accountServer,
	accountView,
	customerCtrl,
	newSubView,
	paymentSelector,
	payrexx,
	payrexxView,
	settingNodes,
	subHomeView,
	subItem,
	upgradeView,
	waitingView,
} from '../selectors'
import { menu, titleBar } from '../selectors'
import { differenceInHours, format } from 'date-fns'
import { expect } from '../framework/fixtures'
import { mimiri } from '../framework/mimiri-context'

export const reloadApp = async () => {
	await mimiri().reload()
	await mimiri().waitForTimeout(250)
	await expect(titleBar.container()).toBeVisible()
	await expect(titleBar.accountButton()).toBeVisible()
	await titleBar.accountButton().click()
	await expect(menu.manageSubscription()).toBeVisible()
	await menu.manageSubscription().click()
}

export const setNow = async (now: Date) => {
	await mimiri().goto(`?now=${format(now, 'yyyy.MM.dd')}`)
	await reloadApp()
}

export const createSubscription = async () => {
	await expect(settingNodes.controlPanel()).toBeVisible()
	await settingNodes.controlPanel().dblclick()
	await expect(settingNodes.subscriptionGroup()).toBeVisible()
	await settingNodes.subscriptionGroup().dblclick()
	await settingNodes.subscription().click()
	await expect(subHomeView.container()).toBeVisible()
	await expect(subItem.free()).toBeVisible()
	await expect(subItem.freeUpgrade()).toBeVisible()
	await subItem.freeUpgrade().click()
	await expect(newSubView.container()).toBeVisible()
	await expect(newSubView.monthly()).toBeVisible()
	await expect(newSubView.yearly()).toBeVisible()
	await expect(newSubView.currencySelector()).toBeVisible()

	await newSubView.currencySelector().selectOption(mimiri().config.currency)

	await expect(subItem.yearly(1)).toBeVisible()
	await expect(subItem.yearly(2)).toBeVisible()
	await expect(subItem.yearly(3)).toBeVisible()
	await expect(subItem.monthly(1)).not.toBeVisible()
	await expect(subItem.monthly(2)).not.toBeVisible()
	await expect(subItem.monthly(3)).not.toBeVisible()

	await newSubView.monthly().click()

	await expect(subItem.yearly(1)).not.toBeVisible()
	await expect(subItem.yearly(2)).not.toBeVisible()
	await expect(subItem.yearly(3)).not.toBeVisible()
	await expect(subItem.monthly(1)).toBeVisible()
	await expect(subItem.monthly(2)).toBeVisible()
	await expect(subItem.monthly(3)).toBeVisible()

	await newSubView.yearly().click()
	await expect(subItem.yearly(1)).toBeVisible()
	await expect(subItem.yearly(2)).toBeVisible()
	await expect(subItem.yearly(3)).toBeVisible()

	await expect(subItem.yearlyChangeTo(1)).toBeVisible()
	await expect(subItem.perYear(1)).toContainText(mimiri().config.currencySymbol)
	await expect(subItem.perMonthDerived(1)).toContainText(mimiri().config.currencySymbol)

	await subItem.yearlyChangeTo(1).click()

	await expect(customerCtrl.container()).toBeVisible()
	await expect(upgradeView.container()).toBeVisible()

	await expect(upgradeView.payButton()).toBeVisible()
	await expect(upgradeView.payButton()).toBeDisabled()

	await expect(subItem.perYear(1)).toContainText(mimiri().config.currencySymbol)
	await expect(subItem.perMonthDerived(1)).toContainText(mimiri().config.currencySymbol)

	await expect(upgradeView.total()).toBeVisible()
	await expect(upgradeView.vat()).toBeVisible()
	await expect(upgradeView.currency()).toBeVisible()
	await expect(upgradeView.total()).toContainText(mimiri().config.currencySymbol)
	await expect(upgradeView.vat()).toContainText(mimiri().config.currencySymbol)
	await expect(upgradeView.currency()).toContainText(mimiri().config.currency)

	await customerCtrl.givenName().fill(mimiri().customer.givenName)
	await customerCtrl.familyName().fill(mimiri().customer.familyName)
	await customerCtrl.company().fill(mimiri().customer.company)
	await customerCtrl.email().fill(mimiri().customer.email)
	await customerCtrl.countrySelector().selectOption(mimiri().customer.countryCode)
	await customerCtrl.stateText().fill(mimiri().customer.state)
	await customerCtrl.city().fill(mimiri().customer.city)
	await customerCtrl.postalCode().fill(mimiri().customer.postalCode)
	await customerCtrl.address().fill(mimiri().customer.address)

	await expect(paymentSelector.loaded()).toHaveValue('true')
	if (await paymentSelector.container().isVisible()) {
		await expect(paymentSelector.new()).toBeVisible()
		await paymentSelector.new().click()
	}

	await expect(upgradeView.acceptTerms()).toBeVisible()
	await expect(upgradeView.acceptPrivacy()).toBeVisible()

	await expect(upgradeView.acceptTerms()).not.toBeChecked()
	await expect(upgradeView.acceptPrivacy()).not.toBeChecked()

	await expect(upgradeView.payButton()).toBeDisabled()
	await upgradeView.acceptTerms().click()
	await expect(upgradeView.payButton()).toBeDisabled()
	await upgradeView.acceptPrivacy().click()
	await expect(upgradeView.payButton()).toBeEnabled()

	mimiri().expectTab(mimiri().config.payUrl)
	await upgradeView.payButton().click()
	await executePayment()

	await expect(subHomeView.container()).toBeVisible()
	await expect(subHomeView.currentSubscriptionSku()).not.toBeEmpty()
	if ((await subHomeView.currentSubscriptionSku().inputValue()) === 'free') {
		await mimiri().waitForTimeout(1000)
		if ((await subHomeView.currentSubscriptionSku().inputValue()) === 'free') {
			console.log('subscription was not updated')
			await mimiri().reload()
			await expect(subHomeView.container()).toBeVisible()
		} else {
			console.log('subscription was updated slowly')
		}
	}
	await expect(subHomeView.currentSubscriptionSku()).toHaveValue('ABO-001-Y')

	await expect(subItem.yearly(1)).toBeVisible()
	await expect(subItem.yearlyChange(1)).toBeVisible()
	await expect(subItem.yearlyCancel(1)).toBeVisible()
	await expect(subItem.renewsAutomatically()).toBeVisible()
	await expect(subItem.endDate()).toBeVisible()
	await expect(subItem.perYear(1)).toBeVisible()
	await expect(subItem.perMonthDerived(1)).toBeVisible()
	await expect(subItem.perYear(1)).toContainText(mimiri().config.currencySymbol)
	await expect(subItem.perMonthDerived(1)).toContainText(mimiri().config.currencySymbol)

	await expect(await subItem.endDate().textContent()).toBeDefined()
	const endDate = new Date((await subItem.endDate().textContent()) ?? '')
	await expect(endDate).toBeInYears(1)

	const paidUntil = new Date((await subHomeView.currentSubscriptionPaidUntil().inputValue()) ?? '')
	await expect(differenceInHours(paidUntil, endDate)).toBeLessThan(24)
}

export const executePayment = async () => {
	await mimiri().enterTab()
	if (mimiri().config.payrexxMode === 'real') {
		await expect(payrexxView.container()).toBeVisible()

		if (mimiri().config.paymentMethod === 'visa') {
			await expect(payrexxView.visa()).toBeVisible()
			await payrexxView.visa().click()
			await mimiri().waitForTimeout(1000)
			await expect(payrexxView.cardNumber()).toBeVisible()
			await expect(payrexxView.cardExpiration()).toBeVisible()
			await expect(payrexxView.cardCvc()).toBeVisible()
			await expect(payrexxView.button()).toBeVisible()
			await payrexxView.cardNumber().fill(mimiri().config.cardNumber)
			await payrexxView.cardExpiration().fill(mimiri().config.cardExpiration)
			await payrexxView.cardCvc().fill(mimiri().config.cardCvc)
			await payrexxView.button().click()
		}

		if (mimiri().config.paymentMethod === 'twint') {
			await expect(payrexxView.twint()).toBeVisible()
			await payrexxView.twint().click()
		}

		if (mimiri().config.paymentMethod === 'mastercard') {
			await expect(payrexxView.mastercard()).toBeVisible()
			await payrexxView.mastercard().click()
			await mimiri().waitForTimeout(1000)
			await expect(payrexxView.cardNumber()).toBeVisible()
			await expect(payrexxView.cardExpiration()).toBeVisible()
			await expect(payrexxView.cardCvc()).toBeVisible()
			await expect(payrexxView.button()).toBeVisible()
			await payrexxView.cardNumber().fill(mimiri().config.cardNumber)
			await payrexxView.cardExpiration().fill(mimiri().config.cardExpiration)
			await payrexxView.cardCvc().fill(mimiri().config.cardCvc)
			await payrexxView.button().click()
		}
	} else {
		await expect(payrexx.successVisa()).toBeVisible()
		await expect(payrexx.successMastercard()).toBeVisible()
		await expect(payrexx.successTwint()).toBeVisible()
		await expect(payrexx.failure()).toBeVisible()
		await expect(payrexx.cancel()).toBeVisible()
		if (mimiri().config.paymentMethod === 'visa') {
			if (mimiri().config.cardNumber === '4000000000000002') {
				await payrexx.failure().click()
			} else {
				await payrexx.successVisa().click()
			}
		}
		if (mimiri().config.paymentMethod === 'twint') {
			await payrexx.successTwint().click()
		}
		if (mimiri().config.paymentMethod === 'mastercard') {
			await payrexx.successMastercard().click()
		}

		await expect(payrexx.redirect()).toBeVisible()
		await payrexx.redirect().click()
	}
	const payUrl = mimiri().config.payUrl
	await mimiri().page.waitForURL(url => !url.href.includes(payUrl))
	await expect(accountServer.paymentResult()).toBeVisible()
	await mimiri().closeTab()
}

export const createMonthlySubscription = async () => {
	await expect(settingNodes.controlPanel()).toBeVisible()
	await settingNodes.controlPanel().dblclick()
	await expect(settingNodes.subscriptionGroup()).toBeVisible()
	await settingNodes.subscriptionGroup().dblclick()
	await settingNodes.subscription().click()
	await subItem.freeUpgrade().click()
	await newSubView.currencySelector().selectOption(mimiri().config.currency)
	await newSubView.monthly().click()
	await subItem.monthlyChangeTo(1).click()
	await customerCtrl.givenName().fill(mimiri().customer.givenName)
	await customerCtrl.familyName().fill(mimiri().customer.familyName)
	await customerCtrl.company().fill(mimiri().customer.company)
	await customerCtrl.email().fill(mimiri().customer.email)
	await customerCtrl.countrySelector().selectOption(mimiri().customer.countryCode)
	await customerCtrl.stateText().fill(mimiri().customer.state)
	await customerCtrl.city().fill(mimiri().customer.city)
	await customerCtrl.postalCode().fill(mimiri().customer.postalCode)
	await customerCtrl.address().fill(mimiri().customer.address)
	await expect(paymentSelector.loaded()).toHaveValue('true')
	if (await paymentSelector.container().isVisible()) {
		await expect(paymentSelector.new()).toBeVisible()
		await paymentSelector.new().click()
	}
	await upgradeView.acceptTerms().click()
	await upgradeView.acceptPrivacy().click()

	mimiri().expectTab(mimiri().config.payUrl)
	await upgradeView.payButton().click()
	await executePayment()

	await expect(subHomeView.container()).toBeVisible()
	await expect(subHomeView.currentSubscriptionSku()).not.toBeEmpty()
	if ((await subHomeView.currentSubscriptionSku().inputValue()) === 'free') {
		await mimiri().waitForTimeout(1000)
		if ((await subHomeView.currentSubscriptionSku().inputValue()) === 'free') {
			console.log('subscription was not updated')
			await mimiri().reload()
			await expect(subHomeView.container()).toBeVisible()
		} else {
			console.log('subscription was updated slowly')
		}
	}
	await expect(subHomeView.currentSubscriptionSku()).toHaveValue('ABO-001-M')

	await expect(subItem.monthly(1)).toBeVisible()
	await expect(subItem.monthlyChange(1)).toBeVisible()
	await expect(subItem.monthlyCancel(1)).toBeVisible()
	await expect(subItem.renewsAutomatically()).toBeVisible()
	await expect(subItem.endDate()).toBeVisible()
	await expect(subItem.perYearDerived(1)).toBeVisible()
	await expect(subItem.perMonth(1)).toBeVisible()

	await expect(await subItem.endDate().textContent()).toBeDefined()
	const endDate = new Date((await subItem.endDate().textContent()) ?? '')
	await expect(endDate).toBeInMonths(1)
}

export const verifyEmail = async () => {
	await settingNodes.billingAddress().click()
	await expect(accountView.verifyEmail()).toBeVisible()
	const message = await mimiri().waitForSubjectToInclude('Verify your Mimiri email')
	const verifyLink = message.Links.find(l => l.text.includes('Verify Email'))
	expect(verifyLink).toBeDefined()
	await mimiri().openTab()
	await mimiri().goto(verifyLink!.url)
	await expect(accountServer.emailVerified()).toBeVisible()
	await mimiri().closeTab()
	await settingNodes.billingAddress().click()
	await expect(accountView.emailVerified()).toBeVisible()
}

export const createBillingAddress = async () => {
	await expect(settingNodes.controlPanel()).toBeVisible()
	await settingNodes.controlPanel().dblclick()
	await expect(settingNodes.subscriptionGroup()).toBeVisible()
	await settingNodes.subscriptionGroup().dblclick()
	await settingNodes.billingAddress().click()

	await expect(accountView.save()).toBeDisabled()

	await customerCtrl.givenName().fill(mimiri().customer.givenName)
	await customerCtrl.familyName().fill(mimiri().customer.familyName)
	await customerCtrl.company().fill(mimiri().customer.company)
	await customerCtrl.email().fill(mimiri().customer.email)
	await customerCtrl.countrySelector().selectOption(mimiri().customer.countryCode)
	await customerCtrl.stateText().fill(mimiri().customer.state)
	await customerCtrl.city().fill(mimiri().customer.city)
	await customerCtrl.postalCode().fill(mimiri().customer.postalCode)
	await customerCtrl.address().fill(mimiri().customer.address)

	await expect(accountView.save()).toBeEnabled()
	await accountView.save().click()
	await expect(accountView.save()).toBeDisabled()

	await expect(accountView.verifyEmail()).toBeVisible()
	await accountView.verifyEmail().click()
	await expect(accountView.verifyEmail()).not.toBeVisible()
	const message = await mimiri().waitForSubjectToInclude('Verify your Mimiri email')
	const verifyLink = message.Links.find(l => l.text.includes('Verify Email'))
	expect(verifyLink).toBeDefined()
	await mimiri().openTab()
	await mimiri().goto(verifyLink!.url)
	await expect(accountServer.emailVerified()).toBeVisible()
	await mimiri().closeTab()
	await settingNodes.billingAddress().click()
	await expect(accountView.emailVerified()).toBeVisible()
}

export const changeBillingAddress = async () => {
	await settingNodes.billingAddress().click()
	await mimiri().waitForTimeout(200)
	await expect(accountView.save()).toBeDisabled()
	await expect(accountServer.emailVerified()).toBeVisible()
	await customerCtrl.givenName().fill(mimiri().customer.givenName + '2')
	await customerCtrl.familyName().fill(mimiri().customer.familyName + '2')
	await expect(accountView.save()).toBeEnabled()
	await accountView.save().click()
	await expect(accountView.save()).toBeDisabled()
	await expect(accountServer.emailVerified()).toBeVisible()
	await customerCtrl.email().fill(mimiri().customer.email.replace('@', 'b@'))
	await expect(accountServer.emailVerified()).not.toBeVisible()
	await expect(accountView.save()).toBeEnabled()
	await accountView.save().click()
	await expect(accountView.save()).toBeDisabled()
	await expect(accountView.verifyEmail()).toBeVisible()
	await accountView.verifyEmail().click()
	await expect(accountView.verifyEmail()).not.toBeVisible()
}

export const failCreateSubscription = async () => {
	await expect(settingNodes.controlPanel()).toBeVisible()
	await settingNodes.controlPanel().dblclick()
	await expect(settingNodes.subscriptionGroup()).toBeVisible()
	await settingNodes.subscriptionGroup().dblclick()
	await settingNodes.subscription().click()
	await expect(subHomeView.container()).toBeVisible()
	await expect(subItem.free()).toBeVisible()
	await subItem.freeUpgrade().click()
	await newSubView.currencySelector().selectOption(mimiri().config.currency)
	await newSubView.yearly().click()
	await subItem.yearlyChangeTo(1).click()

	await customerCtrl.givenName().fill(mimiri().customer.givenName)
	await customerCtrl.familyName().fill(mimiri().customer.familyName)
	await customerCtrl.company().fill(mimiri().customer.company)
	await customerCtrl.email().fill(mimiri().customer.email)
	await customerCtrl.countrySelector().selectOption(mimiri().customer.countryCode)
	await customerCtrl.stateText().fill(mimiri().customer.state)
	await customerCtrl.city().fill(mimiri().customer.city)
	await customerCtrl.postalCode().fill(mimiri().customer.postalCode)
	await customerCtrl.address().fill(mimiri().customer.address)

	await expect(paymentSelector.loaded()).toHaveValue('true')
	if (await paymentSelector.container().isVisible()) {
		await expect(paymentSelector.new()).toBeVisible()
		await paymentSelector.new().click()
	}

	await upgradeView.acceptTerms().click()
	await upgradeView.acceptPrivacy().click()

	mimiri().expectTab(mimiri().config.payUrl)
	await upgradeView.payButton().click()
	await executePayment()

	await expect(waitingView.container()).toBeVisible()
	// await expect(waitingView.report()).toBeVisible()
	await expect(waitingView.check()).toBeVisible()
	await expect(waitingView.cancel()).toBeVisible()
	await waitingView.check().click()
	await expect(waitingView.container()).toBeVisible()

	let url = ''
	await mimiri()
		.page.context()
		.waitForEvent('requestfinished', item => {
			url = item.url()
			return true
		})
	expect(url).toContain('/invoice/')
	await mimiri().waitForTimeout(250)
	await expect(waitingView.container()).toBeVisible()
	await waitingView.cancel().click()

	await expect(subHomeView.container()).toBeVisible()
	await expect(subItem.free()).toBeVisible()
}

export const cancelCreateSubscription = async () => {
	await expect(settingNodes.controlPanel()).toBeVisible()
	await settingNodes.controlPanel().dblclick()
	await expect(settingNodes.subscriptionGroup()).toBeVisible()
	await settingNodes.subscriptionGroup().dblclick()
	await settingNodes.subscription().click()
	await expect(subHomeView.container()).toBeVisible()
	await expect(subItem.free()).toBeVisible()
	await subItem.freeUpgrade().click()
	await newSubView.currencySelector().selectOption(mimiri().config.currency)
	await newSubView.yearly().click()
	await subItem.yearlyChangeTo(1).click()

	await customerCtrl.givenName().fill(mimiri().customer.givenName)
	await customerCtrl.familyName().fill(mimiri().customer.familyName)
	await customerCtrl.company().fill(mimiri().customer.company)
	await customerCtrl.email().fill(mimiri().customer.email)
	await customerCtrl.countrySelector().selectOption(mimiri().customer.countryCode)
	await customerCtrl.stateText().fill(mimiri().customer.state)
	await customerCtrl.city().fill(mimiri().customer.city)
	await customerCtrl.postalCode().fill(mimiri().customer.postalCode)
	await customerCtrl.address().fill(mimiri().customer.address)

	await expect(paymentSelector.loaded()).toHaveValue('true')
	if (await paymentSelector.container().isVisible()) {
		await expect(paymentSelector.new()).toBeVisible()
		await paymentSelector.new().click()
	}

	await upgradeView.acceptTerms().click()
	await upgradeView.acceptPrivacy().click()

	mimiri().expectTab(mimiri().config.payUrl)
	await upgradeView.payButton().click()
	await mimiri().enterTab()

	await expect(payrexx.successVisa()).toBeVisible()
	await expect(payrexx.failure()).toBeVisible()
	await expect(payrexx.cancel()).toBeVisible()

	await payrexx.cancel().click()

	await expect(payrexx.redirect()).toBeVisible()
	await payrexx.redirect().click()
	await mimiri().closeTab()

	await expect(waitingView.container()).toBeVisible()
	// await expect(waitingView.report()).toBeVisible()
	await expect(waitingView.check()).toBeVisible()
	await expect(waitingView.cancel()).toBeVisible()
	await waitingView.check().click()
	await expect(waitingView.container()).toBeVisible()

	let url = ''
	await mimiri()
		.page.context()
		.waitForEvent('requestfinished', item => {
			url = item.url()
			return true
		})
	expect(url).toContain('/invoice/')
	await mimiri().waitForTimeout(250)
	await expect(waitingView.container()).toBeVisible()
	await waitingView.cancel().click()

	await expect(subHomeView.container()).toBeVisible()
	await expect(subItem.free()).toBeVisible()
}

export const navigateAwayCreateSubscription = async () => {
	await expect(settingNodes.controlPanel()).toBeVisible()
	await settingNodes.controlPanel().dblclick()
	await expect(settingNodes.subscriptionGroup()).toBeVisible()
	await settingNodes.subscriptionGroup().dblclick()
	await settingNodes.subscription().click()
	await expect(subHomeView.container()).toBeVisible()
	await expect(subItem.free()).toBeVisible()
	await subItem.freeUpgrade().click()
	await newSubView.currencySelector().selectOption(mimiri().config.currency)
	await newSubView.yearly().click()
	await subItem.yearlyChangeTo(1).click()

	await customerCtrl.givenName().fill(mimiri().customer.givenName)
	await customerCtrl.familyName().fill(mimiri().customer.familyName)
	await customerCtrl.company().fill(mimiri().customer.company)
	await customerCtrl.email().fill(mimiri().customer.email)
	await customerCtrl.countrySelector().selectOption(mimiri().customer.countryCode)
	await customerCtrl.stateText().fill(mimiri().customer.state)
	await customerCtrl.city().fill(mimiri().customer.city)
	await customerCtrl.postalCode().fill(mimiri().customer.postalCode)
	await customerCtrl.address().fill(mimiri().customer.address)

	await expect(paymentSelector.loaded()).toHaveValue('true')
	if (await paymentSelector.container().isVisible()) {
		await expect(paymentSelector.new()).toBeVisible()
		await paymentSelector.new().click()
	}

	await upgradeView.acceptTerms().click()
	await upgradeView.acceptPrivacy().click()

	mimiri().expectTab(mimiri().config.payUrl)
	await upgradeView.payButton().click()
	await mimiri().enterTab()

	await expect(payrexx.successVisa()).toBeVisible()
	await expect(payrexx.failure()).toBeVisible()
	await expect(payrexx.cancel()).toBeVisible()

	await mimiri().closeTab()

	await expect(waitingView.container()).toBeVisible()
	// await expect(waitingView.report()).toBeVisible()
	await expect(waitingView.check()).toBeVisible()
	await expect(waitingView.cancel()).toBeVisible()
	await waitingView.check().click()
	await expect(waitingView.container()).toBeVisible()

	let url = ''
	await mimiri()
		.page.context()
		.waitForEvent('requestfinished', item => {
			url = item.url()
			return true
		})
	expect(url).toContain('/invoice/')
	await mimiri().waitForTimeout(250)
	await expect(waitingView.container()).toBeVisible()
	await waitingView.cancel().click()
}
