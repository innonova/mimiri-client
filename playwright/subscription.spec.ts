import { chromium, test } from '@playwright/test'
import {
	cancelCreateSubscription,
	createMonthlySubscription,
	createSubscription,
	doLogin,
	failCreateSubscription,
	grandfather,
	navigateAwayCreateSubscription,
	reset,
	useMastercard,
	useRealPayrexx,
	useTwint,
	useVisa,
	useVisaFailure,
	verifyEmail,
} from './subscription/actions'
import { mail } from './subscription/clients'
import {
	checkAccount,
	checkInvoices,
	checkNoInvoices,
	checkPaymentMethods,
	checkUserTier0,
	checkUserTier0WithSharing,
	checkUserTier1,
	checkUserTier2,
} from './subscription/checks'
import {
	cancelSubscription,
	failRenewal,
	failRenewalDeclined,
	failRenewalNoMethods,
	firstRenewal,
	ignoreRenewalFailure,
	recoverFromHome,
	recoverFromInvoices,
	retryRenewal,
	retryRenewalTwice,
	secondRenewal,
} from './subscription/renewal'
import {
	changePeriodAndTier,
	changePeriodToMonthly,
	changePeriodToYearly,
	downgradeSubscription,
	upgradeSubscription,
} from './subscription/change'
import { config } from './subscription/data'
import { pwState } from './subscription/pw-state'

let allTestsPassed = true

test.describe.configure({ mode: 'serial' })

test.beforeAll(async () => {
	await pwState.init()
	await pwState.goto('/')
})

test.afterEach(() => {
	if (test.info().status !== test.info().expectedStatus) {
		allTestsPassed = false
	}
})

test.afterAll(async () => {
	if (allTestsPassed) {
		await mail.deleteTagged(config.testId)
	}
})

test.describe.skip('setup ui for dev', () => {
	test(`login`, doLogin)
	test(`reset`, reset)
	// test(`navigate away create subscription`, navigateAwayCreateSubscription)
	// test(`use real payrexx`, useRealPayrexx)
	// test(`use failing visa`, useVisaFailure)
	// test(`use twint`, useTwint)
	// test(`use mastercard`, useMastercard)
	test(`create subscription`, createSubscription)
	// test(`first renewal`, firstRenewal)
	// test(`second renewal`, secondRenewal)
	// test(`fail renewal`, failRenewalDeclined)
})

test.describe('login', () => {
	test(`login`, doLogin)
})

test.describe.skip('real payrexx visa', () => {
	test(`reset`, reset)
	test(`use real payrexx`, useRealPayrexx)
	test(`use visa`, useVisa)
	test(`create subscription`, createSubscription)
	test(`first renewal`, firstRenewal)
	test(`second renewal`, secondRenewal)
})

test.describe.skip('real payrexx mastercard', () => {
	test(`reset`, reset)
	test(`use real payrexx`, useRealPayrexx)
	test(`use mastercard`, useMastercard)
	test(`create subscription`, createSubscription)
	test(`first renewal`, firstRenewal)
	test(`second renewal`, secondRenewal)
})

test.describe.skip('real payrexx twint', () => {
	test(`reset`, reset)
	test(`use real payrexx`, useRealPayrexx)
	test(`use twint`, useTwint)
	test(`create subscription`, createSubscription)
	test(`first renewal`, firstRenewal)
	test(`second renewal`, secondRenewal)
})

test.describe('create subscription', () => {
	test(`reset`, reset)
	test(`check user is tier 0`, checkUserTier0)
	test(`create subscription`, createSubscription)
	test(`verify payment methods`, checkPaymentMethods)
	test(`verify invoices`, checkInvoices)
	test(`verify email`, verifyEmail)
	test(`verify account`, checkAccount)
	test(`verify user is tier 1`, checkUserTier1)
})

test.describe('create monthly subscription', () => {
	test(`reset`, reset)
	test(`create monthly subscription`, createMonthlySubscription)
})

test.describe('renewal', () => {
	test(`reset`, reset)
	test(`create subscription`, createSubscription)
	test(`first renewal`, firstRenewal)
	test(`second renewal`, secondRenewal)
})

test.describe('renewal (monthly)', () => {
	test(`reset`, reset)
	test(`create monthly subscription`, createMonthlySubscription)
	test(`first renewal`, firstRenewal)
	test(`second renewal`, secondRenewal)
})

test.describe('renewal retry once', () => {
	test(`reset`, reset)
	test(`create subscription`, createSubscription)
	test(`retry renewal`, retryRenewal)
})

test.describe('renewal retry once (monthly)', () => {
	test(`reset`, reset)
	test(`create subscription`, createMonthlySubscription)
	test(`retry renewal`, retryRenewal)
})

test.describe('renewal retry twice', () => {
	test(`reset`, reset)
	test(`create subscription`, createSubscription)
	test(`retry renewal twice`, retryRenewalTwice)
})

test.describe('renewal retry twice (monthly)', () => {
	test(`reset`, reset)
	test(`create subscription`, createMonthlySubscription)
	test(`retry renewal twice`, retryRenewalTwice)
})

test.describe('renewal fail', () => {
	test(`reset`, reset)
	test(`create subscription`, createSubscription)
	test(`fail renewal`, failRenewal)
})

test.describe('renewal fail (monthly)', () => {
	test(`reset`, reset)
	test(`create subscription`, createMonthlySubscription)
	test(`fail renewal`, failRenewal)
})

test.describe('renewal fail -> recover from home', () => {
	test(`reset`, reset)
	test(`create subscription`, createSubscription)
	test(`verify email`, verifyEmail)
	test(`fail renewal`, failRenewal)
	test(`recover from home`, recoverFromHome)
})

test.describe('renewal fail -> recover from home (monthly)', () => {
	test(`reset`, reset)
	test(`create subscription`, createMonthlySubscription)
	test(`verify email`, verifyEmail)
	test(`fail renewal`, failRenewal)
	test(`recover from home`, recoverFromHome)
})

test.describe('renewal fail -> recover from invoices', () => {
	test(`reset`, reset)
	test(`create subscription`, createSubscription)
	test(`verify email`, verifyEmail)
	test(`fail renewal`, failRenewal)
	test(`recover from invoices`, recoverFromInvoices)
})

test.describe('renewal fail -> recover from invoices (monthly)', () => {
	test(`reset`, reset)
	test(`create subscription`, createMonthlySubscription)
	test(`verify email`, verifyEmail)
	test(`fail renewal`, failRenewal)
	test(`recover from invoices`, recoverFromInvoices)
})

test.describe('renewal fail no methods', () => {
	test(`reset`, reset)
	test(`create subscription`, createSubscription)
	test(`fail renewal`, failRenewalNoMethods)
})

test.describe('renewal fail no methods (monthly)', () => {
	test(`reset`, reset)
	test(`create subscription`, createMonthlySubscription)
	test(`fail renewal`, failRenewalNoMethods)
})

test.describe('renewal fail declined', () => {
	test(`reset`, reset)
	test(`create subscription`, createSubscription)
	test(`fail renewal`, failRenewalDeclined)
})

test.describe('mastercard', () => {
	test(`reset`, reset)
	test(`use mastercard`, useMastercard)
	test(`create subscription`, createSubscription)
	test(`first renewal`, firstRenewal)
	test(`second renewal`, secondRenewal)
})

test.describe('twint', () => {
	test(`reset`, reset)
	test(`use twint`, useTwint)
	test(`create subscription`, createSubscription)
	test(`first renewal`, firstRenewal)
	test(`second renewal`, secondRenewal)
})

test.describe('cancel subscription', () => {
	test(`reset`, reset)
	test(`create subscription`, createSubscription)
	test(`cancel subscription`, cancelSubscription)
})

test.describe('renewal fail no reaction', () => {
	test(`reset`, reset)
	test(`create subscription`, createSubscription)
	test(`verify user is tier 1`, checkUserTier1)
	test(`fail renewal`, failRenewal)
	test(`ignore renewal failure`, ignoreRenewalFailure)
	test(`verify user is tier 0`, checkUserTier0)
})

test.describe('renewal fail no reaction (monthly)', () => {
	test(`reset`, reset)
	test(`create subscription`, createMonthlySubscription)
	test(`verify user is tier 1`, checkUserTier1)
	test(`fail renewal`, failRenewal)
	test(`ignore renewal failure`, ignoreRenewalFailure)
	test(`verify user is tier 0`, checkUserTier0)
})

test.describe('create new subscription after cancel', () => {
	test(`reset`, reset)
	test(`create subscription`, createSubscription)
	test(`verify email`, verifyEmail)
	test(`cancel subscription`, cancelSubscription)
	test(`create subscription again`, createSubscription)
})

test.describe('change subscription', () => {
	test(`reset`, reset)
	test(`create subscription`, createSubscription)
	test(`check user is tier 1`, checkUserTier1)
	test(`verify email`, verifyEmail)
	test(`upgrade subscription`, upgradeSubscription)
	test(`check user is tier 2`, checkUserTier2)
	test(`downgrade subscription`, downgradeSubscription)
	test(`check user is tier 1 again`, checkUserTier1)
})

test.describe('change period', () => {
	test(`reset`, reset)
	test(`create subscription`, createSubscription)
	test(`check user is tier 1`, checkUserTier1)
	test(`verify email`, verifyEmail)
	test(`change to monthly`, changePeriodToMonthly)
	test(`check user is still tier 1`, checkUserTier1)
	test(`change to yearly`, changePeriodToYearly)
	test(`check user is still tier 1 again`, checkUserTier1)
})

test.describe('change period and tier (year to month)', () => {
	test(`reset`, reset)
	test(`create subscription`, createSubscription)
	test(`check user is tier 1`, checkUserTier1)
	test(`verify email`, verifyEmail)
	test(`change to monthly tier 2`, changePeriodAndTier)
	test(`check user is tier 2`, checkUserTier2)
})

test.describe('change period and tier (month to year)', () => {
	test(`reset`, reset)
	test(`create subscription`, createMonthlySubscription)
	test(`check user is tier 1`, checkUserTier1)
	test(`verify email`, verifyEmail)
	test(`change to yearly tier 2`, changePeriodAndTier)
	test(`check user is tier 2`, checkUserTier2)
})

test.describe('currency USD', () => {
	test(`reset`, reset)
	test(`set currency USD`, () => {
		config.currency = 'USD'
		config.currencySymbol = '$'
	})
	test(`create subscription`, createSubscription)
	test(`verify email`, verifyEmail)
	test(`verify invoices first`, checkInvoices)
	test(`first renewal`, firstRenewal)
	test(`set invoice no`, () => {
		config.invoiceNo = 10328
	})
	test(`verify invoices renewal`, checkInvoices)
})

test.describe('currency EUR', () => {
	test(`reset`, reset)
	test(`set currency EUR`, () => {
		config.currency = 'EUR'
		config.currencySymbol = '€'
	})
	test(`create subscription`, createSubscription)
	test(`verify email`, verifyEmail)
	test(`verify invoices first`, checkInvoices)
	test(`first renewal`, firstRenewal)
	test(`set invoice no`, () => {
		config.invoiceNo = 10328
	})
	test(`verify invoices renewal`, checkInvoices)
})

test.describe('fail payment', () => {
	test(`reset`, reset)
	test(`use visa failure`, useVisaFailure)
	test(`fail create subscription`, failCreateSubscription)
	test(`verify email`, verifyEmail)
	test(`verify no invoices`, checkNoInvoices)
	test(`use visa success`, useVisa)
	test(`create subscription`, createSubscription)
	test(`verify invoice not advanced by failure`, checkInvoices)
})

test.describe('cancel payment', () => {
	test(`reset`, reset)
	test(`cancel create subscription`, cancelCreateSubscription)
	test(`verify email`, verifyEmail)
	test(`verify no invoices`, checkNoInvoices)
	test(`create subscription`, createSubscription)
	test(`verify invoice not advanced by cancel`, checkInvoices)
})

test.describe('navigate away from payment', () => {
	test(`reset`, reset)
	test(`navigate away create subscription`, navigateAwayCreateSubscription)
	test(`verify email`, verifyEmail)
	test(`verify no invoices`, checkNoInvoices)
	test(`create subscription`, createSubscription)
	test(`verify invoice not advanced by cancel`, checkInvoices)
})
