import { expect, test } from '@playwright/test'
import { mimiri, withMimiriContext } from './framework/mimiri-context'
import { settingNodes, settingsGeneral, titleBar } from './selectors'

const openGeneralSettings = async () => {
	await expect(settingNodes.controlPanel()).toBeVisible()
	if (await settingNodes.controlPanelClosed().isVisible()) {
		await settingNodes.controlPanelClosed().click()
	}
	if (await settingNodes.settingGroupClosed().isVisible()) {
		await settingNodes.settingGroupClosed().click()
	}
	await settingNodes.general().click()
	await expect(settingsGeneral.language()).toBeVisible()
}

test.describe('settings', () => {
	test('theme selection switches between light and dark', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await openGeneralSettings()

			await settingsGeneral.theme().selectOption('dark')
			await settingsGeneral.save().click()
			await expect(mimiri().page.locator('html')).toHaveAttribute('data-theme', 'dark')

			await settingsGeneral.theme().selectOption('light')
			await settingsGeneral.save().click()
			await expect(mimiri().page.locator('html')).toHaveAttribute('data-theme', 'light')
		})
	})

	test('language switch retitles the UI and system notes live', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await expect(settingNodes.recycleBin()).toContainText('Recycle Bin')
			await openGeneralSettings()

			await settingsGeneral.language().selectOption('de')
			await settingsGeneral.save().click()
			// System notes retitle immediately, UI strings switch
			await expect(settingNodes.recycleBin()).toContainText('Papierkorb')
			await expect(settingsGeneral.save()).toHaveText(/Speichern/)

			await settingsGeneral.language().selectOption('en')
			await settingsGeneral.save().click()
			await expect(settingNodes.recycleBin()).toContainText('Recycle Bin')
			await expect(settingsGeneral.save()).toHaveText(/Save/)
		})
	})
})
