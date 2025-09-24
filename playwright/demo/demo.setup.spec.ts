import { test } from '@playwright/test'
import { mimiri, withMimiriContext } from '../framework/mimiri-context'
import { createCloudAccount, login } from '../core/actions'
import { createTestTree, deleteAllNotes } from '../notes/actions'
import { aliceInitialTree } from './demo.alice'
import { bobInitialTree } from './demo.bob'

test.describe('Demo Setup', () => {
	test.skip('Setup Alice Account', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			mimiri().config.username = 'Alice'
			mimiri().config.password = process.env.DEMO_ACCOUNT_PASSWORD!
			mimiri().config.cleanUp = false
			await createCloudAccount()
		})
	})

	test.skip('Populate Alice Account', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			mimiri().config.username = 'Alice'
			mimiri().config.password = process.env.DEMO_ACCOUNT_PASSWORD!
			mimiri().config.cleanUp = false
			await login()
			await deleteAllNotes()
			await createTestTree(aliceInitialTree, { verify: false })
		})
	})

	test.skip('Setup Bob Account', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			mimiri().config.username = 'Bob'
			mimiri().config.password = process.env.DEMO_ACCOUNT_PASSWORD!
			mimiri().config.cleanUp = false
			await createCloudAccount()
		})
	})

	test.skip('Populate Bob Account', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			mimiri().config.username = 'Bob'
			mimiri().config.password = process.env.DEMO_ACCOUNT_PASSWORD!
			mimiri().config.cleanUp = false
			await login()
			await deleteAllNotes()
			await createTestTree(bobInitialTree, { verify: false })
		})
	})
})
