import { expect, test } from '@playwright/test'
import { mimiri, withMimiriContext } from './framework/mimiri-context'
import { createAccount } from './core/actions'
import { checkAssociatedObjectsAfterDelete, checkAssociatedObjectsInitial } from './deletion/checks'
import { emptyGuid } from './framework/guid'
import { createSubscription } from './subscription/actions'
import { deleteAccount, loginNoLongerAvailable } from './deletion/action'

test.describe('deletion', () => {
	test('verify settings exists', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createAccount()
			let customerId = await mimiri().customerId()
			await expect(customerId).toBe(emptyGuid())
			await createSubscription()
			customerId = await mimiri().customerId()
			await expect(customerId).not.toBe(emptyGuid())
			await checkAssociatedObjectsInitial(customerId)
			await deleteAccount()
			await mimiri().triggerDeletions()
			await checkAssociatedObjectsAfterDelete(customerId)
			await loginNoLongerAvailable()
		})
	})
})
