import { expect, test } from '@playwright/test'
import { mimiri, withMimiriContext } from './framework/mimiri-context'
import { editor, note, settingNodes, settingsGeneral, titleBar } from './selectors'
import { createRootNote } from './notes/actions'

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

	test('default editor applies to notes without their own choice', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await openGeneralSettings()

			// Work relative to the environment's default so both selections are
			// real changes (the save button only enables on a change)
			const initial = await settingsGeneral.defaultEditor().inputValue()
			const other = initial === 'code' ? 'wysiwyg' : 'code'
			const container = (mode: string) =>
				mode === 'code' ? editor.monacoContainer() : editor.proseMirrorContainer()

			await settingsGeneral.defaultEditor().selectOption(other)
			await settingsGeneral.save().click()
			await createRootNote('First Default Note')
			await expect(container(other)).toBeVisible()

			await openGeneralSettings()
			await settingsGeneral.defaultEditor().selectOption(initial)
			await settingsGeneral.save().click()
			await createRootNote('Second Default Note')
			await expect(container(initial)).toBeVisible()

			// The first note never made its own choice, so it follows the new default
			await note.item('First Default Note').click()
			await expect(container(initial)).toBeVisible()
		})
	})
})
