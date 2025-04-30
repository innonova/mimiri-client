import { config } from './data'
import { pwState } from './pw-state'

const tid = (id: string) => {
	return pwState.getByTestId(id)
}

export const homeView = {
	container: () => tid('home-view'),
	currentSubscriptionSku: () => tid('current-subscription-sku'),
	currentSubscriptionPaidUntil: () => tid('current-subscription-paid-until'),
}

export const mainToolbar = {
	container: () => tid('main-toolbar'),
}

export const titleBar = {
	container: () => tid('title-bar'),
	accountButton: () => tid('account-button'),
}

export const menu = {
	manageSubscription: () => tid('menu-manage-subscription'),
}

export const screenMenu = {
	subscription: () => tid('screen-menu-subscription'),
	account: () => tid('screen-menu-account'),
	methods: () => tid('screen-menu-methods'),
	invoices: () => tid('screen-menu-invoices'),
}

export const loginCtrl = {
	container: () => tid('login-view'),
	username: () => tid('username-input'),
	password: () => tid('password-input'),
	button: () => tid('login-button'),
}

export const subItem = {
	monthly: (tier: number) => tid(`sub-ABO-00${tier}-M`),
	yearly: (tier: number) => tid(`sub-ABO-00${tier}-Y`),
	monthlyChangeTo: (tier: number) => tid(`sub-ABO-00${tier}-M-change-to`),
	monthlyChange: (tier: number) => tid(`sub-ABO-00${tier}-M-change`),
	monthlyCancel: (tier: number) => tid(`sub-ABO-00${tier}-M-cancel`),
	yearlyChangeTo: (tier: number) => tid(`sub-ABO-00${tier}-Y-change-to`),
	yearlyChange: (tier: number) => tid(`sub-ABO-00${tier}-Y-change`),
	yearlyCancel: (tier: number) => tid(`sub-ABO-00${tier}-Y-cancel`),
	perMonth: (tier: number) => tid(`sub-ABO-00${tier}-M-per-month`),
	perYear: (tier: number) => tid(`sub-ABO-00${tier}-Y-per-year`),
	perMonthDerived: (tier: number) => tid(`sub-ABO-00${tier}-Y-per-month-derived`),
	perYearDerived: (tier: number) => tid(`sub-ABO-00${tier}-M-per-year-derived`),
	free: () => tid('sub-free'),
	freeUpgrade: () => tid('sub-free-upgrade'),
	overdue: () => tid('subscription-overdue'),
	payNow: () => tid('subscription-overdue-pay-now'),
	renewsAutomatically: () => tid('subscription-renews-automatically'),
	ends: () => tid('subscription-ends'),
	renewsManually: () => tid('subscription-renews-manually'),
	endDate: () => tid('subscription-end-date'),
}

export const newSubView = {
	container: () => tid('new-subscription-view'),
	monthly: () => tid('period-month'),
	yearly: () => tid('period-year'),
	currencySelector: () => tid('currency-selector'),
}

export const customerCtrl = {
	container: () => tid('customer-data'),
	givenName: () => tid('given-name'),
	familyName: () => tid('family-name'),
	company: () => tid('company'),
	email: () => tid('email'),
	countrySelector: () => tid('country-selector'),
	stateSelector: () => tid('state-selector'),
	stateText: () => tid('state-text'),
	city: () => tid('city'),
	postalCode: () => tid('postal-code'),
	address: () => tid('address'),
}

export const upgradeView = {
	container: () => tid('upgrade-view'),
	acceptTerms: () => tid('accept-terms'),
	acceptPrivacy: () => tid('accept-privacy'),
	payButton: () => tid('pay-button'),
	total: () => tid('upgrade-total'),
	vat: () => tid('upgrade-vat'),
	currency: () => tid('upgrade-currency'),
}

export const payInvoiceView = {
	container: () => tid('pay-invoice-view'),
	acceptTerms: () => tid('accept-terms'),
	acceptPrivacy: () => tid('accept-privacy'),
	payButton: () => tid('pay-button'),
}

export const paymentSelector = {
	container: () => tid('payment-method-selector'),
	new: () => tid('payment-method-NEW'),
}

export const paymentMethodsView = {
	container: () => tid('payment-methods-view'),
	card4242: () => tid('payment-method-4242xxxxxxxx4242-container'),
	card4242IsDefault: () => tid('payment-method-4242xxxxxxxx4242-is-default'),
	card4242Delete: () => tid('payment-method-4242xxxxxxxx4242-delete'),
	card4242MakeDefault: () => tid('payment-method-4242xxxxxxxx4242-make-default'),
}

export const invoicesView = {
	container: () => tid('invoices-view'),
	none: () => tid('invoices-none'),
}

export const invoiceItem = {
	container: (no: number) => tid(`invoice-${no}`),
	statusPaid: (no: number) => tid(`invoice-${no}-status-paid`),
	statusOpen: (no: number) => tid(`invoice-${no}-status-open`),
	statusOverdue: (no: number) => tid(`invoice-${no}-status-overdue`),
	statusCredited: (no: number) => tid(`invoice-${no}-status-credited`),
	statusCreditNote: (no: number) => tid(`invoice-${no}-status-credit-note`),
	viewLink: (no: number) => tid(`invoice-${no}-view-link`),
	pdfLink: (no: number) => tid(`invoice-${no}-pdf-link`),
	payNow: (no: number) => tid(`invoice-${no}-pay-now`),
	total: (no: number) => tid(`invoice-${no}-total`),
}

export const invoiceView = {
	container: () => tid(`invoice-view`),
	paidStamp: () => tid(`invoice-paid-stamp`),
	total: () => tid(`invoice-total`),
	vat: () => tid(`invoice-vat`),
	totalVat: () => tid(`invoice-total-vat`),
}

export const accountView = {
	container: () => tid(`account-view`),
	emailVerified: () => tid(`email-verified`),
	verifyEmail: () => tid(`verify-email`),
}

export const payrexx = {
	successVisa: () => tid('payrexx-success-visa'),
	successMastercard: () => tid('payrexx-success-mastercard'),
	successTwint: () => tid('payrexx-success-twint'),
	failure: () => tid('payrexx-failure'),
	cancel: () => tid('payrexx-cancel'),
	redirect: () => tid('payrexx-redirect'),
}

export const payrexxView = {
	container: () => pwState.locator('.theme-outer-wrapper'),
	visa: () => pwState.locator('#payment-methods').locator('[data-payment-method-id=visa]').getByRole('img'),
	twint: () => pwState.locator('#payment-methods').locator('[data-payment-method-id=twint]').getByRole('img'),
	mastercard: () => pwState.locator('#payment-methods').locator('[data-payment-method-id=mastercard]').getByRole('img'),
	cardNumber: () =>
		pwState
			.locator(`#payment-form-${config.paymentMethod} iframe`)
			.contentFrame()
			.getByRole('textbox', { name: 'Card number *' }),
	cardExpiration: () =>
		pwState
			.locator(`#payment-form-${config.paymentMethod} iframe`)
			.contentFrame()
			.getByRole('textbox', { name: 'Expiration *' }),
	cardCvc: () =>
		pwState
			.locator(`#payment-form-${config.paymentMethod} iframe`)
			.contentFrame()
			.getByRole('textbox', { name: 'CVC *' }),
	button: () => pwState.getByRole('button', { name: 'Save means of payment CHF' }),
}

export const waitingView = {
	container: () => tid(`waiting-view`),
	report: () => tid(`waiting-report`),
	check: () => tid(`waiting-check`),
	cancel: () => tid(`waiting-cancel`),
}
