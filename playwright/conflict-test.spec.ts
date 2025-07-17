import { expect, test } from '@playwright/test'
import { mimiri, mimiriClone, withMimiriContext } from './framework/mimiri-context'
import { menu, note, editor, inconsistencyDialog, settingNodes, emptyRecycleBinDialog } from './selectors'
import { createRootNote, createTestTree, getTextFromEditor, replaceTextInEditor, verifyTestTree } from './notes/actions'
import { createCloudAccount, goOffline, goOnline, login } from './core/actions'
import { syncNoteCreationTree } from './notes/data.sync'
import { conflictScenarios } from './notes/data.text-conflicts'
import { moveTestTree, moveTestTreeAfterConflict } from './notes/data.metadata-conflicts'

// test.describe.configure({ mode: 'serial' })

test.describe.only('conflict tests', () => {
	test('verify all text merge scenarios are covered', async () => {
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
					await goOffline()

					await note.item(scenario.description).click()
					await replaceTextInEditor(scenario.local)
					await editor.save().click()

					mimiri(1, true)

					await note.item(scenario.description).click()
					await replaceTextInEditor(scenario.remote)
					await editor.save().click()

					mimiri(0, true)
					await goOnline()

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

	test('verify node rename conflicts', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createCloudAccount()
			await createTestTree(syncNoteCreationTree)

			await mimiriClone(true)
			await mimiri().home()
			await login()

			await expect(note.item('Sync Marker')).toBeVisible()

			mimiri(0, true)
			await createTestTree(moveTestTree)
			mimiri(1, true)
			await verifyTestTree(moveTestTree)

			mimiri(0, true)
			await goOffline()
			await note.item('Technical Specifications').click({ button: 'right' })
			await menu.rename().click()
			await mimiri().page.keyboard.type('Tech Specs')
			await mimiri().page.keyboard.press('Enter')

			mimiri(1, true)
			await note.item('Technical Specifications').click({ button: 'right' })
			await menu.rename().click()
			await mimiri().page.keyboard.type('Not Tech Specs')
			await mimiri().page.keyboard.press('Enter')

			await expect(note.item('Not Tech Specs')).toBeVisible()

			mimiri(0, true)

			await expect(note.item('Tech Specs')).toBeVisible()
			await goOnline()
			await expect(note.item('Tech Specs')).toBeVisible()

			mimiri(1, true)
			await expect(note.item('Tech Specs')).toBeVisible()
			await expect(note.item('Not Tech Specs')).not.toBeVisible()

			await mimiri().pause()
		})
	})

	test('verify node move conflicts', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createCloudAccount()
			await createTestTree(syncNoteCreationTree)

			await mimiriClone(true)
			await mimiri().home()
			await login()

			await expect(note.item('Sync Marker')).toBeVisible()

			mimiri(0, true)
			await createTestTree(moveTestTree)
			mimiri(1, true)
			await verifyTestTree(moveTestTree)

			mimiri(0, true)
			await goOffline()
			await note.item('Technical Specifications').click({ button: 'right' })
			await menu.cut().click()
			await note.item('Morning Reflections').click({ button: 'right' })
			await menu.paste().click()

			mimiri(1, true)
			await note.item('Technical Specifications').click({ button: 'right' })
			await menu.cut().click()
			await note.item('Italian Classics').click({ button: 'right' })
			await menu.paste().click()

			mimiri(0, true)
			await goOnline()

			await expect(inconsistencyDialog.container()).toBeVisible()
			await inconsistencyDialog.reloadButton().click()

			await verifyTestTree(moveTestTreeAfterConflict)

			mimiri(1, true)
			await verifyTestTree(moveTestTreeAfterConflict)
		})
	})

	test('verify node delete conflicts', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await createCloudAccount()
			await createTestTree(syncNoteCreationTree)

			await mimiriClone(true)
			await mimiri().home()
			await login()

			await expect(note.item('Sync Marker')).toBeVisible()

			mimiri(0, true)
			await createTestTree(moveTestTree)
			mimiri(1, true)
			await verifyTestTree(moveTestTree)

			mimiri(0, true)
			await goOffline()
			await note.item('Technical Specifications').click()
			await replaceTextInEditor('Modified Tech Specs in note about to be deleted by remote')
			await note.item('Technical Specifications').click()

			mimiri(1, true)
			await note.item('Technical Specifications').click({ button: 'right' })
			await menu.recycle().click()
			await settingNodes.recycleBin().click({ button: 'right' })
			await menu.emptyRecycleBin().click()

			expect(emptyRecycleBinDialog.container()).toBeVisible()
			await emptyRecycleBinDialog.okButton().click()
			await expect(note.item('Technical Specifications')).not.toBeVisible()

			mimiri(0, true)
			await expect(note.item('Technical Specifications')).toBeVisible()

			await goOnline()

			await expect(inconsistencyDialog.container()).toBeVisible()
			await inconsistencyDialog.reloadButton().click()
			expect(inconsistencyDialog.container()).not.toBeVisible()
			await expect(note.item('Technical Specifications')).not.toBeVisible()
			await settingNodes.recycleBinClosed().click()
			await expect(note.item('Technical Specifications')).toBeVisible()

			mimiri(1, true)
			await expect(note.item('Technical Specifications')).toBeVisible()
			await settingNodes.recycleBinOpen().click()
			await expect(note.item('Technical Specifications')).not.toBeVisible()
		})
	})
})
