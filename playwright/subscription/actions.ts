import {
	accountView,
	customerCtrl,
	homeView,
	loginCtrl,
	mainToolbar,
	menu,
	newSubView,
	paymentSelector,
	payrexx,
	payrexxView,
	screenMenu,
	subItem,
	titleBar,
	upgradeView,
	waitingView,
} from './selectors'
import {
	config,
	customer,
	password,
	resetData,
	setMasterSuccess,
	setTwintSuccess,
	setVisaFailure,
	setVisaSuccess,
	username,
} from './data'
import { mail, orch } from './clients'
import { differenceInHours, format } from 'date-fns'
import { expect } from './fixtures'
import { pwState } from './pw-state'

export const reset = async () => {
	resetData()
	config.payUrl = 'http://localhost:3001/'
	await orch.useMockPayrexx()
	setVisaSuccess()
	await orch.resetDatabaseSoft(username)
	await mail.hideTagged(config.testId)
	await pwState.goto('/')
	await expect(titleBar.container()).toBeVisible()
	await expect(titleBar.accountButton()).toBeVisible()
	await titleBar.accountButton().click()
	await expect(menu.manageSubscription()).toBeVisible()
	await menu.manageSubscription().click()
}

export const reloadApp = async () => {
	await pwState.reload()
	await expect(titleBar.container()).toBeVisible()
	await expect(titleBar.accountButton()).toBeVisible()
	await titleBar.accountButton().click()
	await expect(menu.manageSubscription()).toBeVisible()
	await menu.manageSubscription().click()
}

export const setNow = async (now: Date) => {
	await pwState.goto(`?now=${format(now, 'yyyy.MM.dd')}`)
	await reloadApp()
}

export const useRealPayrexx = async () => {
	config.payUrl = 'https://mimiri.payrexx.com/'
	await orch.useRealPayrexx()
}

export const useVisa = () => {
	setVisaSuccess()
}

export const useVisaFailure = () => {
	setVisaFailure()
}

export const useTwint = () => {
	setTwintSuccess()
}

export const useMastercard = () => {
	setMasterSuccess()
}

export const grandfather = async () => {
	await orch.grandfather(username)
}

export const doLogin = async () => {
	await pwState.goto('/')
	await expect(loginCtrl.container()).toBeVisible()
	await expect(loginCtrl.username()).toBeVisible()
	await expect(loginCtrl.password()).toBeVisible()
	await expect(loginCtrl.button()).toBeVisible()
	await loginCtrl.username().fill(username)
	await loginCtrl.password().fill(password)
	await loginCtrl.button().click()
	await expect(mainToolbar.container()).toBeVisible()
	await expect(titleBar.container()).toBeVisible()
}

export const createSubscription = async () => {
	await screenMenu.subscription().click()
	await expect(homeView.container()).toBeVisible()
	await expect(subItem.free()).toBeVisible()
	await expect(subItem.freeUpgrade()).toBeVisible()
	await subItem.freeUpgrade().click()
	await expect(newSubView.container()).toBeVisible()
	await expect(newSubView.monthly()).toBeVisible()
	await expect(newSubView.yearly()).toBeVisible()
	await expect(newSubView.currencySelector()).toBeVisible()

	await newSubView.currencySelector().selectOption(config.currency)

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
	await expect(subItem.perYear(1)).toContainText(config.currencySymbol)
	await expect(subItem.perMonthDerived(1)).toContainText(config.currencySymbol)

	await subItem.yearlyChangeTo(1).click()

	await expect(customerCtrl.container()).toBeVisible()
	await expect(upgradeView.container()).toBeVisible()

	await expect(upgradeView.payButton()).toBeVisible()
	await expect(upgradeView.payButton()).toBeDisabled()

	await expect(subItem.perYear(1)).toContainText(config.currencySymbol)
	await expect(subItem.perMonthDerived(1)).toContainText(config.currencySymbol)

	await expect(upgradeView.total()).toBeVisible()
	await expect(upgradeView.vat()).toBeVisible()
	await expect(upgradeView.currency()).toBeVisible()
	await expect(upgradeView.total()).toContainText(config.currencySymbol)
	await expect(upgradeView.vat()).toContainText(config.currencySymbol)
	await expect(upgradeView.currency()).toContainText(config.currency)

	await customerCtrl.givenName().fill(customer.givenName)
	await customerCtrl.familyName().fill(customer.familyName)
	await customerCtrl.company().fill(customer.company)
	await customerCtrl.email().fill(customer.email)
	await customerCtrl.countrySelector().selectOption(customer.countryCode)
	await customerCtrl.stateText().fill(customer.state)
	await customerCtrl.city().fill(customer.city)
	await customerCtrl.postalCode().fill(customer.postalCode)
	await customerCtrl.address().fill(customer.address)

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

	pwState.expectTab(config.payUrl)
	await upgradeView.payButton().click()
	await executePayment()

	await expect(homeView.container()).toBeVisible()

	await expect(subItem.yearly(1)).toBeVisible()
	await expect(subItem.yearlyChange(1)).toBeVisible()
	await expect(subItem.yearlyCancel(1)).toBeVisible()
	await expect(subItem.renewsAutomatically()).toBeVisible()
	await expect(subItem.endDate()).toBeVisible()
	await expect(subItem.perYear(1)).toBeVisible()
	await expect(subItem.perMonthDerived(1)).toBeVisible()
	await expect(subItem.perYear(1)).toContainText(config.currencySymbol)
	await expect(subItem.perMonthDerived(1)).toContainText(config.currencySymbol)

	await expect(homeView.currentSubscriptionSku()).toHaveValue('ABO-001-Y')
	await expect(await subItem.endDate().textContent()).toBeDefined()
	const endDate = new Date((await subItem.endDate().textContent()) ?? '')
	await expect(endDate).toBeInYears(1)

	const paidUntil = new Date((await homeView.currentSubscriptionPaidUntil().inputValue()) ?? '')
	await expect(differenceInHours(paidUntil, endDate)).toBeLessThan(24)
}

export const executePayment = async () => {
	await pwState.enterTab()
	if (config.payrexxMode === 'real') {
		await expect(payrexxView.container()).toBeVisible()

		if (config.paymentMethod === 'visa') {
			await expect(payrexxView.visa()).toBeVisible()
			await payrexxView.visa().click()
			await pwState.waitForTimeout(1000)
			await expect(payrexxView.cardNumber()).toBeVisible()
			await expect(payrexxView.cardExpiration()).toBeVisible()
			await expect(payrexxView.cardCvc()).toBeVisible()
			await expect(payrexxView.button()).toBeVisible()
			await payrexxView.cardNumber().fill(config.cardNumber)
			await payrexxView.cardExpiration().fill(config.cardExpiration)
			await payrexxView.cardCvc().fill(config.cardCvc)
			await payrexxView.button().click()
		}

		if (config.paymentMethod === 'twint') {
			await expect(payrexxView.twint()).toBeVisible()
			await payrexxView.twint().click()
		}

		if (config.paymentMethod === 'mastercard') {
			await expect(payrexxView.mastercard()).toBeVisible()
			await payrexxView.mastercard().click()
			await pwState.waitForTimeout(1000)
			await expect(payrexxView.cardNumber()).toBeVisible()
			await expect(payrexxView.cardExpiration()).toBeVisible()
			await expect(payrexxView.cardCvc()).toBeVisible()
			await expect(payrexxView.button()).toBeVisible()
			await payrexxView.cardNumber().fill(config.cardNumber)
			await payrexxView.cardExpiration().fill(config.cardExpiration)
			await payrexxView.cardCvc().fill(config.cardCvc)
			await payrexxView.button().click()
		}
	} else {
		await expect(payrexx.successVisa()).toBeVisible()
		await expect(payrexx.successMastercard()).toBeVisible()
		await expect(payrexx.successTwint()).toBeVisible()
		await expect(payrexx.failure()).toBeVisible()
		await expect(payrexx.cancel()).toBeVisible()
		if (config.paymentMethod === 'visa') {
			if (config.cardNumber === '4000000000000002') {
				await payrexx.failure().click()
			} else {
				await payrexx.successVisa().click()
			}
		}
		if (config.paymentMethod === 'twint') {
			await payrexx.successTwint().click()
		}
		if (config.paymentMethod === 'mastercard') {
			await payrexx.successMastercard().click()
		}

		await expect(payrexx.redirect()).toBeVisible()
		await payrexx.redirect().click()
	}
	await pwState.page.waitForURL(url => !url.href.includes(config.payUrl))
	await pwState.waitForTimeout(100)
	await pwState.closeTab()
}

export const createMonthlySubscription = async () => {
	await screenMenu.subscription().click()
	await subItem.freeUpgrade().click()
	await newSubView.currencySelector().selectOption(config.currency)
	await newSubView.monthly().click()
	await subItem.monthlyChangeTo(1).click()
	await customerCtrl.givenName().fill(customer.givenName)
	await customerCtrl.familyName().fill(customer.familyName)
	await customerCtrl.company().fill(customer.company)
	await customerCtrl.email().fill(customer.email)
	await customerCtrl.countrySelector().selectOption(customer.countryCode)
	await customerCtrl.stateText().fill(customer.state)
	await customerCtrl.city().fill(customer.city)
	await customerCtrl.postalCode().fill(customer.postalCode)
	await customerCtrl.address().fill(customer.address)
	if (await paymentSelector.container().isVisible()) {
		await expect(paymentSelector.new()).toBeVisible()
		await paymentSelector.new().click()
	}
	await upgradeView.acceptTerms().click()
	await upgradeView.acceptPrivacy().click()

	pwState.expectTab(config.payUrl)
	await upgradeView.payButton().click()
	await executePayment()
	await expect(homeView.container()).toBeVisible()
	await expect(subItem.monthly(1)).toBeVisible()
	await expect(subItem.monthlyChange(1)).toBeVisible()
	await expect(subItem.monthlyCancel(1)).toBeVisible()
	await expect(subItem.renewsAutomatically()).toBeVisible()
	await expect(subItem.endDate()).toBeVisible()
	await expect(subItem.perYearDerived(1)).toBeVisible()
	await expect(subItem.perMonth(1)).toBeVisible()

	await expect(homeView.currentSubscriptionSku()).toHaveValue('ABO-001-M')
	await expect(await subItem.endDate().textContent()).toBeDefined()
	const endDate = new Date((await subItem.endDate().textContent()) ?? '')
	await expect(endDate).toBeInMonths(1)
}

export const verifyEmail = async () => {
	await screenMenu.account().click()
	await expect(accountView.verifyEmail()).toBeVisible()
	const message = await mail.waitForSubjectToInclude('Verify your Mimiri email')
	const verifyLink = message.Links.find(l => l.text.includes('Verify Email'))
	expect(verifyLink).toBeDefined()
	await pwState.openTab()
	await pwState.goto(verifyLink!.url)
	await pwState.closeTab()
	await reloadApp()
	await screenMenu.account().click()
	await expect(accountView.emailVerified()).toBeVisible()
}

export const failCreateSubscription = async () => {
	await screenMenu.subscription().click()
	await expect(homeView.container()).toBeVisible()
	await expect(subItem.free()).toBeVisible()
	await subItem.freeUpgrade().click()
	await newSubView.currencySelector().selectOption(config.currency)
	await newSubView.yearly().click()
	await subItem.yearlyChangeTo(1).click()

	await customerCtrl.givenName().fill(customer.givenName)
	await customerCtrl.familyName().fill(customer.familyName)
	await customerCtrl.company().fill(customer.company)
	await customerCtrl.email().fill(customer.email)
	await customerCtrl.countrySelector().selectOption(customer.countryCode)
	await customerCtrl.stateText().fill(customer.state)
	await customerCtrl.city().fill(customer.city)
	await customerCtrl.postalCode().fill(customer.postalCode)
	await customerCtrl.address().fill(customer.address)

	if (await paymentSelector.container().isVisible()) {
		await expect(paymentSelector.new()).toBeVisible()
		await paymentSelector.new().click()
	}

	await upgradeView.acceptTerms().click()
	await upgradeView.acceptPrivacy().click()

	pwState.expectTab(config.payUrl)
	await upgradeView.payButton().click()
	await executePayment()

	await expect(waitingView.container()).toBeVisible()
	await expect(waitingView.report()).toBeVisible()
	await expect(waitingView.check()).toBeVisible()
	await expect(waitingView.cancel()).toBeVisible()
	await waitingView.check().click()
	await expect(waitingView.container()).toBeVisible()

	let url = ''
	await pwState.page.context().waitForEvent('requestfinished', item => {
		url = item.url()
		return true
	})
	expect(url).toContain('/invoice/')
	await pwState.waitForTimeout(250)
	await expect(waitingView.container()).toBeVisible()
	await waitingView.cancel().click()

	await expect(homeView.container()).toBeVisible()
	await expect(subItem.free()).toBeVisible()
}

export const cancelCreateSubscription = async () => {
	await screenMenu.subscription().click()
	await expect(homeView.container()).toBeVisible()
	await expect(subItem.free()).toBeVisible()
	await subItem.freeUpgrade().click()
	await newSubView.currencySelector().selectOption(config.currency)
	await newSubView.yearly().click()
	await subItem.yearlyChangeTo(1).click()

	await customerCtrl.givenName().fill(customer.givenName)
	await customerCtrl.familyName().fill(customer.familyName)
	await customerCtrl.company().fill(customer.company)
	await customerCtrl.email().fill(customer.email)
	await customerCtrl.countrySelector().selectOption(customer.countryCode)
	await customerCtrl.stateText().fill(customer.state)
	await customerCtrl.city().fill(customer.city)
	await customerCtrl.postalCode().fill(customer.postalCode)
	await customerCtrl.address().fill(customer.address)

	if (await paymentSelector.container().isVisible()) {
		await expect(paymentSelector.new()).toBeVisible()
		await paymentSelector.new().click()
	}

	await upgradeView.acceptTerms().click()
	await upgradeView.acceptPrivacy().click()

	pwState.expectTab(config.payUrl)
	await upgradeView.payButton().click()
	await pwState.enterTab()

	await expect(payrexx.successVisa()).toBeVisible()
	await expect(payrexx.failure()).toBeVisible()
	await expect(payrexx.cancel()).toBeVisible()

	await payrexx.cancel().click()

	await expect(payrexx.redirect()).toBeVisible()
	await payrexx.redirect().click()
	await pwState.closeTab()

	await expect(waitingView.container()).toBeVisible()
	await expect(waitingView.report()).toBeVisible()
	await expect(waitingView.check()).toBeVisible()
	await expect(waitingView.cancel()).toBeVisible()
	await waitingView.check().click()
	await expect(waitingView.container()).toBeVisible()

	let url = ''
	await pwState.page.context().waitForEvent('requestfinished', item => {
		url = item.url()
		return true
	})
	expect(url).toContain('/invoice/')
	await pwState.waitForTimeout(250)
	await expect(waitingView.container()).toBeVisible()
	await waitingView.cancel().click()

	await expect(homeView.container()).toBeVisible()
	await expect(subItem.free()).toBeVisible()
}

export const navigateAwayCreateSubscription = async () => {
	await screenMenu.subscription().click()
	await expect(homeView.container()).toBeVisible()
	await expect(subItem.free()).toBeVisible()
	await subItem.freeUpgrade().click()
	await newSubView.currencySelector().selectOption(config.currency)
	await newSubView.yearly().click()
	await subItem.yearlyChangeTo(1).click()

	await customerCtrl.givenName().fill(customer.givenName)
	await customerCtrl.familyName().fill(customer.familyName)
	await customerCtrl.company().fill(customer.company)
	await customerCtrl.email().fill(customer.email)
	await customerCtrl.countrySelector().selectOption(customer.countryCode)
	await customerCtrl.stateText().fill(customer.state)
	await customerCtrl.city().fill(customer.city)
	await customerCtrl.postalCode().fill(customer.postalCode)
	await customerCtrl.address().fill(customer.address)

	if (await paymentSelector.container().isVisible()) {
		await expect(paymentSelector.new()).toBeVisible()
		await paymentSelector.new().click()
	}

	await upgradeView.acceptTerms().click()
	await upgradeView.acceptPrivacy().click()

	pwState.expectTab(config.payUrl)
	await upgradeView.payButton().click()
	await pwState.enterTab()

	await expect(payrexx.successVisa()).toBeVisible()
	await expect(payrexx.failure()).toBeVisible()
	await expect(payrexx.cancel()).toBeVisible()

	await pwState.closeTab()

	await expect(waitingView.container()).toBeVisible()
	await expect(waitingView.report()).toBeVisible()
	await expect(waitingView.check()).toBeVisible()
	await expect(waitingView.cancel()).toBeVisible()
	await waitingView.check().click()
	await expect(waitingView.container()).toBeVisible()

	let url = ''
	await pwState.page.context().waitForEvent('requestfinished', item => {
		url = item.url()
		return true
	})
	expect(url).toContain('/invoice/')
	await pwState.waitForTimeout(250)
	await expect(waitingView.container()).toBeVisible()
	await waitingView.cancel().click()
}
