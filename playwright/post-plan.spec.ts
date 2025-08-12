import { expect, test } from '@playwright/test'
import { mimiri, withMimiriContext } from './framework/mimiri-context'
import {
	createAccountView,
	initialPlanChooser,
	settingNodes,
	settingView,
	subItem,
	titleBar,
	upgradeView,
	usernameInput,
} from './selectors'

// test.describe.configure({ mode: 'serial' })

test.describe('cloud account', () => {
	test('verify post create plan choice, after reload', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await settingNodes.createAccount().click()
			await createAccountView.cloudTab().click()
			await createAccountView.username().fill(mimiri().config.username)
			await createAccountView.password().fill(mimiri().config.password)
			await createAccountView.repeat().fill(mimiri().config.password)
			await expect(usernameInput.available()).toBeVisible()
			await createAccountView.button().click()
			await expect(createAccountView.container()).not.toBeVisible()
			await mimiri().waitForTimeout(1000)
			await expect(initialPlanChooser.container()).toBeVisible()
			await mimiri().reload()
			await expect(initialPlanChooser.container()).toBeVisible()
		})
	})

	test('verify post create plan choice, free', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await settingNodes.createAccount().click()
			await createAccountView.cloudTab().click()
			await createAccountView.username().fill(mimiri().config.username)
			await createAccountView.password().fill(mimiri().config.password)
			await createAccountView.repeat().fill(mimiri().config.password)
			await expect(usernameInput.available()).toBeVisible()
			await createAccountView.button().click()
			await expect(createAccountView.container()).not.toBeVisible()
			await mimiri().waitForTimeout(1000)
			await expect(initialPlanChooser.container()).toBeVisible()
			await initialPlanChooser.chooseFree().click()
			await expect(settingView.currentPlan()).toBeVisible()
			await expect(subItem.free()).toBeVisible()
			await mimiri().reload()
			await mimiri().waitForTimeout(1000)
			await expect(initialPlanChooser.container()).not.toBeVisible()
		})
	})

	test('verify post create plan choice, chf, year, tier 2', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await settingNodes.createAccount().click()
			await createAccountView.cloudTab().click()
			await createAccountView.username().fill(mimiri().config.username)
			await createAccountView.password().fill(mimiri().config.password)
			await createAccountView.repeat().fill(mimiri().config.password)
			await expect(usernameInput.available()).toBeVisible()
			await createAccountView.button().click()
			await expect(createAccountView.container()).not.toBeVisible()
			await mimiri().waitForTimeout(1000)
			await expect(initialPlanChooser.container()).toBeVisible()
			await initialPlanChooser.chooseTier2Year().click()
			await expect(upgradeView.container()).toBeVisible()
			await expect(upgradeView.currency()).toHaveText('CHF')
			await expect(upgradeView.tier2Year()).toBeVisible()
			await mimiri().reload()
			await mimiri().waitForTimeout(1000)
			await expect(initialPlanChooser.container()).not.toBeVisible()
		})
	})

	test('verify post create plan choice, eur, monthly, tier 1', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await settingNodes.createAccount().click()
			await createAccountView.cloudTab().click()
			await createAccountView.username().fill(mimiri().config.username)
			await createAccountView.password().fill(mimiri().config.password)
			await createAccountView.repeat().fill(mimiri().config.password)
			await expect(usernameInput.available()).toBeVisible()
			await createAccountView.button().click()
			await expect(createAccountView.container()).not.toBeVisible()
			await mimiri().waitForTimeout(1000)
			await expect(initialPlanChooser.container()).toBeVisible()
			await initialPlanChooser.periodMonth().click()
			await initialPlanChooser.currencySelector().selectOption('EUR')
			await initialPlanChooser.chooseTier1Month().click()
			await expect(upgradeView.container()).toBeVisible()
			await expect(upgradeView.currency()).toHaveText('EUR')
			await expect(upgradeView.tier1Month()).toBeVisible()
			await mimiri().reload()
			await mimiri().waitForTimeout(1000)
			await expect(initialPlanChooser.container()).not.toBeVisible()
		})
	})
})
