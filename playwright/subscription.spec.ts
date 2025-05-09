import { test } from '@playwright/test'
import {
	cancelCreateSubscription,
	changeBillingAddress,
	createBillingAddress,
	createMonthlySubscription,
	createSubscription,
	failCreateSubscription,
	navigateAwayCreateSubscription,
	verifyEmail,
} from './subscription/actions'
import {
	checkAccount,
	checkInvoices,
	checkNoInvoices,
	checkPaymentMethods,
	checkUserTier0,
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
import { mimiri, withMimiriContext } from './framework/mimiri-context'
import { createAccount } from './core/actions'

test.describe.skip('setup ui for dev', () => {
	// test(`login`, doLogin)
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

test.describe('subscription', () => {
	test('create subscription', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createAccount()
			await checkUserTier0()
			await createSubscription()
			await checkPaymentMethods()
			await checkInvoices()
			await verifyEmail()
			await checkAccount()
			await checkUserTier1()
		})
	})

	test('set billing address from empty', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createAccount()
			await createBillingAddress()
			await changeBillingAddress()
		})
	})

	test('create monthly subscription', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createAccount()
			await createMonthlySubscription()
		})
	})

	test.skip('real payrexx visa', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createAccount()
			await mimiri().useRealPayrexx()
			mimiri().setVisaSuccess()
			await createSubscription()
			await firstRenewal()
			await secondRenewal()
		})
	})

	test.skip('real payrexx mastercard', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createAccount()
			await mimiri().useRealPayrexx()
			mimiri().setMasterSuccess()
			await createSubscription()
			await firstRenewal()
			await secondRenewal()
		})
	})

	test.skip('real payrexx twint', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createAccount()
			await mimiri().useRealPayrexx()
			mimiri().setTwintSuccess()
			await createSubscription()
			await firstRenewal()
			await secondRenewal()
		})
	})

	test('renewal', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createAccount()
			await createSubscription()
			await firstRenewal()
			await secondRenewal()
		})
	})

	test('renewal (monthly)', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createAccount()
			await createMonthlySubscription()
			await firstRenewal()
			await secondRenewal()
		})
	})

	test('renewal retry once', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createAccount()
			await createSubscription()
			await retryRenewal()
		})
	})

	test('renewal retry once (monthly)', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createAccount()
			await createMonthlySubscription()
			await retryRenewal()
		})
	})

	test('renewal retry twice', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createAccount()
			await createSubscription()
			await retryRenewalTwice()
		})
	})

	test('renewal retry twice (monthly)', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createAccount()
			await createMonthlySubscription()
			await retryRenewalTwice()
		})
	})

	test('renewal fail', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createAccount()
			await createSubscription()
			await failRenewal()
		})
	})

	test('renewal fail (monthly)', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createAccount()
			await createMonthlySubscription()
			await failRenewal()
		})
	})

	test('renewal fail -> recover from home', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createAccount()
			await createSubscription()
			await verifyEmail()
			await failRenewal()
			await recoverFromHome()
		})
	})

	test('renewal fail -> recover from home (monthly)', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createAccount()
			await createMonthlySubscription()
			await verifyEmail()
			await failRenewal()
			await recoverFromHome()
		})
	})

	test('renewal fail -> recover from invoices', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createAccount()
			await createSubscription()
			await verifyEmail()
			await failRenewal()
			await recoverFromInvoices()
		})
	})

	test('renewal fail -> recover from invoices (monthly)', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createAccount()
			await createSubscription()
			await verifyEmail()
			await failRenewal()
			await recoverFromInvoices()
		})
	})

	test('renewal fail no methods', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createAccount()
			await createSubscription()
			await failRenewalNoMethods()
		})
	})

	test('renewal fail no methods (monthly)', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createAccount()
			await createSubscription()
			await failRenewalNoMethods()
		})
	})

	test('renewal fail declined', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createAccount()
			await createSubscription()
			await failRenewalDeclined()
		})
	})

	test('mastercard', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createAccount()
			mimiri().setMasterSuccess()
			await createSubscription()
			await firstRenewal()
			await secondRenewal()
		})
	})

	test('twint', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createAccount()
			mimiri().setTwintSuccess()
			await createSubscription()
			await firstRenewal()
			await secondRenewal()
		})
	})

	test('cancel subscription', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createAccount()
			await createSubscription()
			await cancelSubscription()
		})
	})

	test('renewal fail no reaction', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createAccount()
			await createSubscription()
			await checkUserTier1()
			await failRenewal()
			await ignoreRenewalFailure()
			await checkUserTier0()
		})
	})

	test('renewal fail no reaction (monthly)', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createAccount()
			await createMonthlySubscription()
			await checkUserTier1()
			await failRenewal()
			await ignoreRenewalFailure()
			await checkUserTier0()
		})
	})

	test('create new subscription after cancel', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createAccount()
			await createSubscription()
			await verifyEmail()
			await cancelSubscription()
			await createSubscription()
		})
	})

	test('change subscription', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createAccount()
			await createSubscription()
			await checkUserTier1()
			await verifyEmail()
			await upgradeSubscription()
			await checkUserTier2()
			await downgradeSubscription()
			await checkUserTier1()
		})
	})

	test('change period', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createAccount()
			await createSubscription()
			await checkUserTier1()
			await verifyEmail()
			await changePeriodToMonthly()
			await checkUserTier1()
			await changePeriodToYearly()
			await checkUserTier1()
		})
	})

	test('change period and tier (year to month)', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createAccount()
			await createSubscription()
			await checkUserTier1()
			await verifyEmail()
			await changePeriodAndTier()
			await checkUserTier2()
		})
	})

	test('change period and tier (month to year)', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createAccount()
			await createMonthlySubscription()
			await checkUserTier1()
			await verifyEmail()
			await changePeriodAndTier()
			await checkUserTier2()
		})
	})

	test('currency USD', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createAccount()
			mimiri().config.currency = 'USD'
			mimiri().config.currencySymbol = '$'
			await createSubscription()
			await verifyEmail()
			await checkInvoices()
			await firstRenewal()
			await checkInvoices()
		})
	})

	test('currency EUR', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createAccount()
			mimiri().config.currency = 'EUR'
			mimiri().config.currencySymbol = '€'
			await createSubscription()
			await verifyEmail()
			await checkInvoices()
			await firstRenewal()
			await checkInvoices()
		})
	})

	test('fail payment', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createAccount()
			mimiri().setVisaFailure()
			await failCreateSubscription()
			await verifyEmail()
			await checkNoInvoices()
			mimiri().setVisaSuccess()
			await createSubscription()
			await checkInvoices()
		})
	})

	test('cancel payment', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createAccount()
			await cancelCreateSubscription()
			await verifyEmail()
			await checkNoInvoices()
			await createSubscription()
			await checkInvoices()
		})
	})

	test('navigate away from payment', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createAccount()
			await navigateAwayCreateSubscription()
			await verifyEmail()
			await checkNoInvoices()
			await createSubscription()
			await checkInvoices()
		})
	})

	/* Template

	test.only('', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createAccount()
			await createSubscription()
		})
	})
		*/
})
