import { chromium, expect, Page, test } from '@playwright/test'
import { generateRandomString } from './utils'

test.describe.configure({ mode: 'serial' })

let page: Page

test.beforeAll(async () => {
	const browser = await chromium.launch()
	page = await browser.newPage()
	await page.goto('/')
})

const randomId = generateRandomString(8)
const username = 'test_automation_longer_than_input_field_' + randomId // Very long so random value is not visible in input field when taking screenshots
const password = 'password_' + randomId

test.describe.skip('e2e user flow', () => {
	test(`should create account`, async () => {
		const createAccountLink = page.getByTestId('create-account-link')
		const usernameInput = page.getByTestId('username-input')
		const passwordInput = page.getByTestId('password-input')
		const repeatInput = page.getByTestId('repeat-input')
		const termsCheckbox = page.getByTestId('terms-checkbox')
		const privacyCheckbox = page.getByTestId('privacy-checkbox')
		const noRecoverCheckbox = page.getByTestId('no-recover-checkbox')
		const createButton = page.getByTestId('create-button')
		const noteTree = page.getByTestId('note-tree')

		await createAccountLink.click()
		await expect(usernameInput).toBeVisible()
		await expect(page).toHaveScreenshot('create-account.png')
		await usernameInput.fill(username)
		await passwordInput.fill(password)
		await repeatInput.fill(password)
		await termsCheckbox.check()
		await privacyCheckbox.check()
		await noRecoverCheckbox.check()
		await expect(createButton).toBeEnabled()
		await expect(page).toHaveScreenshot('create-account-filled.png')
		await createButton.click()
		await expect(noteTree).toBeVisible({ timeout: 30000 })
	})

	test(`should verify data in account`, async () => {
		const firstNode = page.getByTestId('tree-node').nth(1)
		await firstNode.click()
		await expect(firstNode).toHaveText('Getting Started')
		await page.waitForTimeout(100) // CSS inside the Monaco editor takes a little while to get applied, saw no better option than to wait a bit for it
		await expect(page).toHaveScreenshot('getting-started.png')
	})

	test(`should delete account`, async () => {
		const accountButton = page.getByTestId('account-button')
		const deleteAccountMenu = page.getByTestId('menu-delete-account')
		const deleteAccountCheckbox = page.getByTestId('delete-account-checkbox')
		const deleteDataCheckbox = page.getByTestId('delete-data-checkbox')
		const noRecoverCheckbox = page.getByTestId('no-recovery-checkbox')
		const passwordInput = page.getByTestId('password-input')
		const submitButton = page.getByTestId('submit-button')

		await accountButton.click()
		await deleteAccountMenu.click()
		await expect(passwordInput).toBeVisible()
		await expect(page).toHaveScreenshot('delete-account.png')
		await deleteAccountCheckbox.check()
		await deleteDataCheckbox.check()
		await noRecoverCheckbox.check()
		await passwordInput.fill(password)
		await expect(submitButton).toBeEnabled()
		await expect(page).toHaveScreenshot('delete-account-filled.png')
		await submitButton.click()
	})
})
