import { expect, test } from '@playwright/test'
import { generateRandomString } from './utils'

const randomId = generateRandomString(8)

test.describe('Unauthorized', () => {
    test(`should create account`, async ({ page }) => {
      await page.goto('/')
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