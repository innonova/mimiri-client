import { expect } from '@playwright/test'
import { Guid } from '../framework/guid'
import { mimiri } from '../framework/mimiri-context'

export const checkAssociatedObjectsInitial = async (customerId: Guid) => {
	const associatedObjects = await mimiri().associatedObjects(customerId)
	expect(associatedObjects.customers).toBe(1)
	expect(associatedObjects.invoices).toBe(1)
	expect(associatedObjects.paymentLinks).toBe(1)
	expect(associatedObjects.paymentMethods).toBe(1)
	expect(associatedObjects.paymentTransactions).toBe(1)
	expect(associatedObjects.subscriptions).toBe(1)
	expect(associatedObjects.subscriptionHistoryEntries).toBe(0)
	expect(associatedObjects.subscriptionRenewals).toBe(1)
}

export const checkAssociatedObjectsAfterDelete = async (customerId: Guid) => {
	const associatedObjects = await mimiri().associatedObjects(customerId)
	expect(associatedObjects.customers).toBe(0)
	expect(associatedObjects.paymentLinks).toBe(0)
	expect(associatedObjects.paymentMethods).toBe(0)
	expect(associatedObjects.subscriptions).toBe(0)
	expect(associatedObjects.subscriptionHistoryEntries).toBe(0)
	expect(associatedObjects.subscriptionRenewals).toBe(0)
	// Legal bookkeeping requirements
	expect(associatedObjects.invoices).toBe(1)
	expect(associatedObjects.paymentTransactions).toBe(1)
}
