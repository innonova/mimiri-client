import { expect, test } from '@playwright/test'
import { mimiri, withMimiriContext } from './framework/mimiri-context'
import { emptyRecycleBinDialog, menu, note, titleBar } from './selectors'
import { createChildNote, createRootNote } from './notes/actions'

// test.describe.configure({ mode: 'serial' })

const systemNotes = ['System', 'Settings', 'Updates', 'Dev Blog', 'Create Account', 'General', 'Fonts', 'Recycle Bin']

test.describe('system notes', () => {
	test('verify cannot cut, copy, duplicate, rename or delete system notes from menus', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createRootNote('Test Target Note')
			await createRootNote('Test Source Note')
			await note.item('Settings').dblclick()
			for (const item of systemNotes) {
				await note.item(item).click({ button: 'right' })
				await expect(menu.copy()).not.toBeVisible()
				await expect(menu.cut()).not.toBeVisible()
				await expect(menu.duplicate()).not.toBeVisible()
				await expect(menu.paste()).not.toBeVisible()
				await expect(menu.delete()).not.toBeVisible()
				await expect(menu.recycle()).not.toBeVisible()
				await expect(menu.rename()).not.toBeVisible()
				await menu.backdrop().click()
				await titleBar.edit().click()
				await expect(menu.copy()).toHaveClass(/disabled/)
				await expect(menu.cut()).toHaveClass(/disabled/)
				await expect(menu.duplicate()).toHaveClass(/disabled/)
				await expect(menu.recycle()).toHaveClass(/disabled/)
				await expect(menu.rename()).toHaveClass(/disabled/)
				await expect(menu.paste()).toHaveClass(/disabled/)
				await titleBar.container().click()
			}
		})
	})

	test('verify cannot cut, copy, rename or delete system notes using keyboard shortcuts', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await note.item('Settings').dblclick()
			await createRootNote('Test Target Note')
			await createRootNote('Test Source Note')
			await note.item('Test Source Note').click()
			await createChildNote('Test Child Note')
			await note.item('Test Child Note').click()
			await mimiri().keyboard.press('Control+x')
			await note.item('Test Target Note').click()
			await mimiri().keyboard.press('Control+v')
			await expect(note.item('Test Child Note', note.container('Test Target Note'))).toBeVisible()
			for (const item of systemNotes) {
				await note.item(item).click()
				await mimiri().keyboard.press('Control+c')
				await note.item('Test Target Note').click()
				await mimiri().keyboard.press('Control+v')
				await expect(note.item(item, note.container('Test Target Note'))).not.toBeVisible()

				await note.item(item).click()
				await mimiri().keyboard.press('Control+x')
				await note.item('Test Target Note').click()
				await mimiri().keyboard.press('Control+v')
				await expect(note.item(item, note.container('Test Target Note'))).not.toBeVisible()
			}
			await note.item('Test Child Note').click()
			await mimiri().keyboard.press('F2')
			await expect(note.renameInput()).toBeVisible()
			await mimiri().keyboard.press('Enter')
			await expect(note.item('Test Child Note', note.container('Test Target Note'))).toBeVisible()

			await mimiri().keyboard.press('Control+Delete')
			await expect(note.item('Test Child Note', note.container('Test Target Note'))).not.toBeVisible()
			await expect(note.item('Test Child Note', note.container('Recycle Bin'))).toBeVisible()
			await note.item('Recycle Bin').click({ button: 'right' })
			await menu.emptyRecycleBin().click()
			await emptyRecycleBinDialog.okButton().click()
			await expect(note.item('Test Child Note')).not.toBeVisible()

			for (const item of systemNotes) {
				await note.item(item).click()
				await mimiri().keyboard.press('Control+Delete')
				await expect(note.item(item, note.container('Recycle Bin'))).not.toBeVisible()
				await expect(note.item(item)).toBeVisible()
			}
			for (const item of systemNotes) {
				await note.item(item).click()
				await mimiri().keyboard.press('F2')
				await expect(note.renameInput()).not.toBeVisible()
			}

			await expect(note.items('Test Source Note')).toHaveCount(1)
			await note.items('Test Source Note').click()
			await mimiri().keyboard.press('Control+d')
			await expect(note.items('Test Source Note')).toHaveCount(2)

			for (const item of systemNotes) {
				await note.item(item).click()
				await expect(note.items(item)).toHaveCount(1)
				await mimiri().keyboard.press('Control+d')
				await expect(note.items(item)).toHaveCount(1)
			}
		})
	})
})
