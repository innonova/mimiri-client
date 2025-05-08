import { test } from '@playwright/test'
import { mimiri, withMimiriContext } from './framework/mimiri-context'
import { createAccount } from './core/actions'
import {
	verifySettings,
	verifySettingsFromAccountMenu,
	verifySubscriptionToggle,
	verifySystemContextMenu,
} from './core/checks'

// test.describe.configure({ mode: 'serial' })

test.describe('core', () => {
	test('verify settings exists', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createAccount()
			await verifySettings()
		})
	})
	test('verify alternate settings access', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createAccount()
			await verifySettingsFromAccountMenu()
		})
	})
	test('verify subscription feature toggle', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createAccount(false)
			await verifySubscriptionToggle()
		})
	})
	test('verify system context menu', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createAccount()
			await verifySystemContextMenu()
		})
	})
})
