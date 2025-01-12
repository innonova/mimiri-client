import { expect, test } from '@playwright/test'
import { _electron as electron } from 'playwright'
import { generateRandomString } from './utils'

const randomId = generateRandomString(8)

test.describe('Electron - Unauthorized @test', () => {
	test(`should create account`, async () => {
		const electronApp = await electron.launch({
			args: ['../mimiri-client-electron/main.js'],
			executablePath: '../mimiri-client-electron/node_modules/electron/dist/electron.exe',
		})

		// Evaluation expression in the Electron context.
		const appPath = await electronApp.evaluate(async ({ app }) => {
			// This runs in the main Electron process, parameter here is always
			// the result of the require('electron') in the main app script.
			return app.getAppPath()
		})
		console.log(appPath)

		const page = await electronApp.firstWindow()

		await page.getByTestId('create-account-link').click()

		const usernameInput = page.getByTestId('username-input')
		const passwordInput = page.getByTestId('password-input')
		const repeatInput = page.getByTestId('repeat-input')
		const privacyCheckbox = page.getByTestId('privacy-checkbox')
		const noRecoverCheckbox = page.getByTestId('no-recover-checkbox')
		const firstNode = page.getByTestId('tree-node').first()

		await usernameInput.fill('test_automation_' + randomId)
		await passwordInput.fill('password_' + randomId)
		await repeatInput.fill('password_' + randomId)
		await privacyCheckbox.check()
		await noRecoverCheckbox.check()

		await page.getByTestId('create-button').click()

		await expect(firstNode).toHaveText('Getting Started')
	})
})
