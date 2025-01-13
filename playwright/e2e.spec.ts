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
const password = 'password_' + randomId

test.describe('e2e user flow', () => {
	test(`should create account`, async () => {
		const createAccountLink = page.getByTestId('create-account-link')
		const usernameInput = page.getByTestId('username-input')
		const passwordInput = page.getByTestId('password-input')
		const repeatInput = page.getByTestId('repeat-input')
		const privacyCheckbox = page.getByTestId('privacy-checkbox')
		const noRecoverCheckbox = page.getByTestId('no-recover-checkbox')
		const createButton = page.getByTestId('create-button')

		await createAccountLink.click()
		await usernameInput.fill('test_automation_' + randomId)
		await passwordInput.fill(password)
		await repeatInput.fill(password)
		await privacyCheckbox.check()
		await noRecoverCheckbox.check()
		await createButton.click()
	})

	test(`should verify data in account`, async () => {
		const firstNode = page.getByTestId('tree-node').first()

		await expect(firstNode).toHaveText('Getting Started')
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
		await deleteAccountCheckbox.check()
		await deleteDataCheckbox.check()
		await noRecoverCheckbox.check()
		await passwordInput.fill(password)
		await submitButton.click()
	})
})
