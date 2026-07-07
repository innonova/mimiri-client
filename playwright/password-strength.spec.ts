import { expect, test } from '@playwright/test'
import { mimiri, withMimiriContext } from './framework/mimiri-context'
import { createAccountView, passwordQuality, settingNodes, titleBar } from './selectors'

// The zxcvbn-based strength meter on the create-account password field.
// Band thresholds (PasswordInput.vue): crack time at 1e4 guesses/s of
// < 0.0001 days -> free-access, < 0.1 days -> casual-use-only, else
// acceptable-security. Sample passwords verified against zxcvbn directly.

const openCreateAccount = async () => {
	await mimiri().home()
	await expect(titleBar.accountButton()).toBeVisible()
	if (await settingNodes.controlPanelClosed().isVisible()) {
		await settingNodes.controlPanel().dblclick()
	}
	await settingNodes.createAccount().click()
	await expect(createAccountView.container()).toBeVisible()
}

test.describe('password strength meter', () => {
	test('rates weak, casual and strong passwords', async () => {
		await withMimiriContext(async () => {
			await openCreateAccount()

			// No indicator while the field is empty
			await expect(passwordQuality.freeAccess()).not.toBeVisible()
			await expect(passwordQuality.casualUseOnly()).not.toBeVisible()
			await expect(passwordQuality.acceptable()).not.toBeVisible()

			await createAccountView.password().fill('password')
			await expect(passwordQuality.freeAccess()).toBeVisible()

			await createAccountView.password().fill('blue7cat')
			await expect(passwordQuality.casualUseOnly()).toBeVisible()
			await expect(passwordQuality.freeAccess()).not.toBeVisible()

			await createAccountView.password().fill('K9#mQ2xLp7vN4z!')
			await expect(passwordQuality.acceptable()).toBeVisible()
			await expect(passwordQuality.casualUseOnly()).not.toBeVisible()

			// Clearing the field clears the indicator again
			await createAccountView.password().fill('')
			await expect(passwordQuality.acceptable()).not.toBeVisible()
		})
	})
})
