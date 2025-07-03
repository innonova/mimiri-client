import { expect, test } from '@playwright/test'
import { mimiri, mimiriCreate, withMimiriContext } from './framework/mimiri-context'
import { connectLocalAccount, createCloudAccount, createLocalAccount } from './core/actions'

// test.describe.configure({ mode: 'serial' })

test.describe('new', () => {
	test('create local account', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createLocalAccount()
		})
	})
	test('promote local account to cloud account', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createLocalAccount()
			await connectLocalAccount()
		})
	})
	test('create cloud account', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createCloudAccount()
		})
	})
	test('share test', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createCloudAccount()
			await mimiriCreate(true)
			await mimiri().home()
			await createCloudAccount()
			await mimiri().pause()
		})
	})
})
