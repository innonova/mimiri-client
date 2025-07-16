import { expect, test } from '@playwright/test'
import { mimiri, mimiriClone, withMimiriContext } from './framework/mimiri-context'
import { menu, note, titleBar, editor } from './selectors'
import {
	createChildNote,
	createRootNote,
	createTestTree,
	getTextFromEditor,
	replaceTextInEditor,
	verifyTestTree,
} from './notes/actions'
import { createCloudAccount, login } from './core/actions'
import { syncNoteCreationTree } from './notes/data.sync'
import { conflictScenarios } from './notes/data.conlfic'
// test.describe.configure({ mode: 'serial' })

test.describe.only('conflict tests', () => {
	test.only('verify all text merge scenarios are covered', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createCloudAccount()
			await createTestTree(syncNoteCreationTree)

			await mimiriClone(true)
			await mimiri().home()
			await login()

			await expect(note.item('Sync Marker')).toBeVisible()
			let text = ''
			for (const scenario of conflictScenarios) {
				try {
					mimiri(0, true)
					await createRootNote(scenario.description, '')

					await note.item(scenario.description).click()
					await replaceTextInEditor(scenario.base)
					await editor.save().click()

					await editor.save().click()
					await titleBar.accountButton().click()
					await menu.workOffline().click()
					await expect(titleBar.accountButton()).toHaveAttribute('title', 'Account (Offline)')

					await note.item(scenario.description).click()
					await replaceTextInEditor(scenario.local)
					await editor.save().click()

					mimiri(1, true)

					await note.item(scenario.description).click()
					await replaceTextInEditor(scenario.remote)
					await editor.save().click()

					mimiri(0, true)
					await titleBar.accountButton().click()
					await menu.workOffline().click()
					await expect(titleBar.accountButton()).toHaveAttribute('title', 'Account (Online)')

					text = await getTextFromEditor()

					await expect(text.replaceAll('\r', '')).toBe(scenario.expected.replaceAll('\r', ''))
				} catch (error) {
					console.log(
						`\n\n\n\n\nScenario: ${scenario.description}, \n\nExpected: \n###${scenario.expected}###\n\nActual: \n###${text}###`,
					)
					console.error(`Error in scenario "${scenario.description}":`, scenario)
					await mimiri().pause()
					throw error
				}
			}
		})
	})
})
