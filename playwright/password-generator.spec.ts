import { expect, test } from '@playwright/test'
import { mimiri, withMimiriContext } from './framework/mimiri-context'
import { menu, passwordGeneratorDialog, titleBar } from './selectors'

// The password generator dialog (Tools menu) is a purely local utility — it
// needs no account and makes no API calls.

const openGenerator = async () => {
	await mimiri().home()
	await expect(titleBar.accountButton()).toBeVisible()
	await titleBar.tools().click()
	await menu.passwordGenerator().click()
	await expect(passwordGeneratorDialog.container()).toBeVisible()
	// A password is generated on open
	await expect.poll(async () => (await passwordGeneratorDialog.password().inputValue()).length).toBeGreaterThan(0)
}

test.describe('password generator', () => {
	test('opens from the Tools menu with a generated password', async () => {
		await withMimiriContext(async () => {
			await openGenerator()
			// Recommended 3rd-party preset generates 10 characters
			expect((await passwordGeneratorDialog.password().inputValue()).length).toBeGreaterThanOrEqual(7)
		})
	})

	test('refresh generates a different password', async () => {
		await withMimiriContext(async () => {
			await openGenerator()
			const first = await passwordGeneratorDialog.password().inputValue()
			await passwordGeneratorDialog.refresh().click()
			await expect.poll(() => passwordGeneratorDialog.password().inputValue()).not.toBe(first)
		})
	})

	test('copy puts the password on the clipboard', async () => {
		await withMimiriContext(async () => {
			await openGenerator()
			const password = await passwordGeneratorDialog.password().inputValue()
			await passwordGeneratorDialog.copyButton().click()
			expect(await mimiri().getClipboardText()).toBe(password)
		})
	})

	test('close button dismisses the dialog', async () => {
		await withMimiriContext(async () => {
			await openGenerator()
			await passwordGeneratorDialog.closeButton().click()
			await expect(passwordGeneratorDialog.container()).not.toBeVisible()
		})
	})
})
