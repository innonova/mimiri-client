import { mimiri } from './framework/mimiri-context'

const tid = (id: string) => {
	return mimiri().getByTestId(id)
}

export const subHomeView = {
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
	file: () => tid('title-menu-file'),
	edit: () => tid('title-menu-edit'),
	view: () => tid('title-menu-view'),
	tools: () => tid('title-menu-tools'),
	help: () => tid('title-menu-help'),
}

export const menu = {
	backdrop: () => tid('context-menu-backdrop'),
	manageSubscription: () => tid('menu-manage-subscription'),
	changeUsername: () => tid('menu-change-username'),
	changePassword: () => tid('menu-change-password'),
	deleteAccount: () => tid('menu-delete-account'),
	about: () => tid('menu-about'),
	settings: () => tid('menu-settings'),
	refresh: () => tid('menu-refresh'),
	delete: () => tid('menu-delete'),
	rename: () => tid('menu-rename'),
	copy: () => tid('menu-copy'),
	cut: () => tid('menu-cut'),
	paste: () => tid('menu-paste'),
	share: () => tid('menu-share'),
	newNote: () => tid('menu-new-note'),
	newRootNote: () => tid('menu-new-root-note'),
	logout: () => tid('menu-logout'),
}

export const dialog = {
	deletePaymentMethod: () => tid('dialog-delete-payment-method'),
	yes: () => tid('dialog-yes'),
	no: () => tid('dialog-no'),
}

export const settingNodes = {
	controlPanel: () => tid('node-control-panel'),
	controlPanelOpen: () => tid('node-control-panel-open'),
	controlPanelClosed: () => tid('node-control-panel-closed'),
	recycleBin: () => tid('node-recycle-bin'),
	update: () => tid('node-settings-update'),
	settingGroup: () => tid('node-settings-group'),
	general: () => tid('node-settings-general'),
	pin: () => tid('node-settings-pin'),
	account: () => tid('node-settings-account'),
	username: () => tid('node-settings-username'),
	password: () => tid('node-settings-password'),
	delete: () => tid('node-settings-delete'),
	subscriptionGroup: () => tid('node-settings-plan-group'),
	subscriptionGroupOpen: () => tid('node-settings-plan-group-open'),
	subscriptionGroupClosed: () => tid('node-settings-plan-group-closed'),
	subscription: () => tid('node-settings-plan'),
	billingAddress: () => tid('node-settings-billing-address'),
	methods: () => tid('node-settings-payment-methods'),
	invoices: () => tid('node-settings-invoices'),
}

export const settingView = {
	about: () => tid('settings-view-about'),
	update: () => tid('settings-view-update'),
	general: () => tid('settings-view-general'),
	pinCode: () => tid('settings-view-pin-code'),
	username: () => tid('settings-view-username'),
	password: () => tid('settings-view-password'),
	deleteAccount: () => tid('settings-view-delete-account'),
}

export const loginCtrl = {
	container: () => tid('login-view'),
	username: () => tid('username-input'),
	password: () => tid('password-input'),
	button: () => tid('login-button'),
	createAccountLink: () => tid('create-account-link'),
	loginError: () => tid('login-error'),
}

export const promoteAccount = {
	container: () => tid('promote-account-view'),
	username: () => tid('promote-account-view').getByTestId('username-input'),
	password: () => tid('promote-account-view').getByTestId('password-input'),
	repeat: () => tid('promote-account-view').getByTestId('repeat-input'),
	noRecover: () => tid('promote-account-view').getByTestId('no-recover-checkbox'),
	button: () => tid('promote-account-view').getByTestId('create-button'),
}

export const createCtrl = {
	container: () => tid('create-account-view'),
	username: () => tid('username-input'),
	password: () => tid('password-input'),
	repeat: () => tid('repeat-input'),
	terms: () => tid('terms-checkbox'),
	privacy: () => tid('privacy-checkbox'),
	weak: () => tid('weak-checkbox'),
	noRecover: () => tid('no-recover-checkbox'),
	button: () => tid('create-button'),
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
	loaded: () => tid('subscriptions-loaded'),
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
	loaded: () => tid('payment-methods-loaded'),
}

export const paymentMethodsView = {
	container: () => tid('settings-view-payment-methods'),
	card4242: () => tid('payment-method-4242xxxxxxxx4242-container'),
	card4242IsDefault: () => tid('payment-method-4242xxxxxxxx4242-is-default'),
	card4242Delete: () => tid('payment-method-4242xxxxxxxx4242-delete'),
	card4242MakeDefault: () => tid('payment-method-4242xxxxxxxx4242-make-default'),
}

export const invoicesView = {
	container: () => tid('invoices-view'),
	none: () => tid('invoices-none'),
	numbers: () => tid('invoice-numbers'),
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
	save: () => tid(`account-save`),
}
export const deleteView = {
	container: () => tid(`settings-view-delete-account`),
	deleteAccount: () => tid(`delete-account-checkbox`),
	deleteData: () => tid(`delete-data-checkbox`),
	noRecovery: () => tid(`no-recovery-checkbox`),
	deleteLocal: () => tid(`delete-local-checkbox`),
	password: () => tid(`delete-account-password-input`),
	submit: () => tid(`delete-account-submit-button`),
}

export const accountServer = {
	emailVerified: () => tid(`email-verified`),
	paymentResult: () => tid(`payment-result-view`),
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
	container: () => mimiri().locator('.theme-outer-wrapper'),
	visa: () => mimiri().locator('#payment-methods').locator('[data-payment-method-id=visa]').getByRole('img'),
	twint: () => mimiri().locator('#payment-methods').locator('[data-payment-method-id=twint]').getByRole('img'),
	mastercard: () =>
		mimiri().locator('#payment-methods').locator('[data-payment-method-id=mastercard]').getByRole('img'),
	cardNumber: () =>
		mimiri()
			.locator(`#payment-form-${mimiri().config.paymentMethod} iframe`)
			.contentFrame()
			.getByRole('textbox', { name: 'Card number *' }),
	cardExpiration: () =>
		mimiri()
			.locator(`#payment-form-${mimiri().config.paymentMethod} iframe`)
			.contentFrame()
			.getByRole('textbox', { name: 'Expiration *' }),
	cardCvc: () =>
		mimiri()
			.locator(`#payment-form-${mimiri().config.paymentMethod} iframe`)
			.contentFrame()
			.getByRole('textbox', { name: 'CVC *' }),
	button: () => mimiri().getByRole('button', { name: 'Save means of payment CHF' }),
}

export const waitingView = {
	container: () => tid(`waiting-view`),
	report: () => tid(`waiting-report`),
	check: () => tid(`waiting-check`),
	cancel: () => tid(`waiting-cancel`),
}
