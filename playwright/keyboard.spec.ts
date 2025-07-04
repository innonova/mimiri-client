import { expect, test } from '@playwright/test'
import { mimiri, withMimiriContext } from './framework/mimiri-context'
import { note, titleBar } from './selectors'
import { createTestTree, verifyTestTree } from './notes/actions'
import {
	keyboardTestTree,
	keyboardTestTreeAfterCut,
	keyboardTestTreeAfterCopy,
	keyboardTestTreeAfterDelete,
	keyboardTestTreeAfterRename,
	keyboardTestTreeAfterDuplicate,
} from './notes/data'

test.describe.configure({ mode: 'serial' })

test.describe('keyboard shortcuts', () => {
	test('verify cut and paste with keyboard shortcuts', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createTestTree(keyboardTestTree)
			await verifyTestTree(keyboardTestTree)
			await note.item('Item X').click()
			await mimiri().keyboard.press('Control+x')
			await note.item('Folder 2').click()
			await mimiri().keyboard.press('Control+v')
			await verifyTestTree(keyboardTestTreeAfterCut)
		})
	})

	test('verify copy and paste with keyboard shortcuts', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createTestTree(keyboardTestTree)
			await verifyTestTree(keyboardTestTree)
			await note.item('Item X').click()
			await mimiri().keyboard.press('Control+c')
			await note.item('Target Folder').click()
			await mimiri().keyboard.press('Control+v')
			await verifyTestTree(keyboardTestTreeAfterCopy)
		})
	})

	test('verify delete with keyboard shortcut', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createTestTree(keyboardTestTree)
			await verifyTestTree(keyboardTestTree)
			await note.item('Item Y').click()
			await mimiri().keyboard.press('Delete')
			await verifyTestTree(keyboardTestTreeAfterDelete)
		})
	})

	test('verify rename with keyboard shortcut', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createTestTree(keyboardTestTree)
			await verifyTestTree(keyboardTestTree)
			await note.item('Item Y').click()
			await mimiri().keyboard.press('F2')
			await note.renameInput().fill('Renamed Item')
			await note.renameInput().press('Enter')
			await verifyTestTree(keyboardTestTreeAfterRename)
		})
	})

	test('verify duplicate with keyboard shortcut', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createTestTree(keyboardTestTree)
			await verifyTestTree(keyboardTestTree)
			await note.item('Item X').click()
			await mimiri().keyboard.press('Control+d')
			// renaming the duplicated item to allow verification
			await mimiri().keyboard.press('F2')
			await note.renameInput().fill('Item X Copy')
			await note.renameInput().press('Enter')
			await verifyTestTree(keyboardTestTreeAfterDuplicate)
		})
	})
})
