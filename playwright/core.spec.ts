import { test } from '@playwright/test'
import { mimiri, withMimiriContext } from './framework/mimiri-context'
import { createAccount, login, logout } from './core/actions'
import { verifySettings, verifySettingsFromAccountMenu, verifySystemContextMenu } from './core/checks'

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
	test('verify system context menu', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createAccount()
			await verifySystemContextMenu()
		})
	})
	test('login again', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createAccount()
			await logout()
			await login()
		})
	})
})
