import { expect, test } from '@playwright/test'
import { mimiri, withMimiriContext } from './framework/mimiri-context'
import {
	deleteNoteDialog,
	emptyRecycleBinDialog,
	infoDialog,
	menu,
	note,
	recycleBinView,
	settingNodes,
	titleBar,
} from './selectors'
import { createTestTree, getTextFromEditor } from './notes/actions'
import type { StandardTreeNode } from './notes/data'

const binTree: StandardTreeNode[] = [
	{
		title: 'Keep Parent',
		text: 'stays in the tree',
	},
	{
		title: 'Victim',
		text: 'note that gets recycled',
		children: [{ title: 'Victim Child', text: 'child content that must survive' }],
	},
]

const setup = async () => {
	await mimiri().home()
	await expect(titleBar.accountButton()).toBeVisible()
	await createTestTree(binTree)
}

const recycleVictim = async () => {
	await note.item('Victim').click({ button: 'right' })
	await menu.recycle().click()
	// The recycled note stays selected, so the bin expands to reveal it —
	// assert it now lives under the recycle bin rather than at the tree root
	await expect(note.item('Victim', note.container('Recycle Bin'))).toBeVisible()
	await expect(note.items('Victim')).toHaveCount(1)
}

test.describe('recycle bin', () => {
	test('recycled note restores by cut/paste with content and children intact', async () => {
		await withMimiriContext(async () => {
			await setup()
			await recycleVictim()

			await note.item('Victim').click({ button: 'right' })
			await menu.cut().click()
			await note.item('Keep Parent').click({ button: 'right' })
			await menu.paste().click()

			await expect(note.item('Victim', note.container('Keep Parent'))).toBeVisible()
			await expect(note.items('Victim')).toHaveCount(1)

			await note.item('Victim').click()
			expect(await getTextFromEditor()).toContain('note that gets recycled')
			await note.expand('Victim').click()
			await note.item('Victim Child').click()
			expect(await getTextFromEditor()).toContain('child content that must survive')
		})
	})

	test('a single note can be permanently deleted from the bin', async () => {
		await withMimiriContext(async () => {
			await setup()
			await recycleVictim()

			await note.item('Victim').click({ button: 'right' })
			// Inside the bin, Delete replaces Recycle
			await expect(menu.recycle()).not.toBeVisible()
			await menu.delete().click()
			await expect(deleteNoteDialog.container()).toBeVisible()
			await deleteNoteDialog.confirmButton().click()

			await expect(note.item('Victim')).not.toBeVisible()
			// The rest of the tree is unaffected
			await expect(note.item('Keep Parent')).toBeVisible()
		})
	})

	test('cancel in the delete dialog keeps the note in the bin', async () => {
		await withMimiriContext(async () => {
			await setup()
			await recycleVictim()

			await note.item('Victim').click({ button: 'right' })
			await menu.delete().click()
			await expect(deleteNoteDialog.container()).toBeVisible()
			await deleteNoteDialog.cancelButton().click()
			await expect(deleteNoteDialog.container()).not.toBeVisible()
			await expect(note.item('Victim')).toBeVisible()
		})
	})

	test('context menu inside the bin hides create/rename/paste/share', async () => {
		await withMimiriContext(async () => {
			await setup()
			await recycleVictim()

			await note.item('Victim').click({ button: 'right' })
			await expect(menu.delete()).toBeVisible()
			await expect(menu.cut()).toBeVisible()
			await expect(menu.copy()).toBeVisible()
			await expect(menu.properties()).toBeVisible()
			await expect(menu.newNote()).not.toBeVisible()
			await expect(menu.rename()).not.toBeVisible()
			await expect(menu.paste()).not.toBeVisible()
			await expect(menu.share()).not.toBeVisible()
			await expect(menu.recycle()).not.toBeVisible()
			await mimiri().page.keyboard.press('Escape')
		})
	})

	test('settings page: scan for inconsistencies reports a clean tree', async () => {
		await withMimiriContext(async () => {
			await setup()
			await settingNodes.recycleBin().click()
			await expect(recycleBinView.scan()).toBeVisible()
			// Nothing recycled yet, so emptying is not available
			await expect(recycleBinView.empty()).toBeDisabled()

			await recycleBinView.scan().click()
			await expect(infoDialog.container()).toBeVisible()
			await infoDialog.okButton().click()
			await expect(infoDialog.container()).not.toBeVisible()
		})
	})

	test('settings page: empty recycle bin from settings', async () => {
		await withMimiriContext(async () => {
			await setup()
			await recycleVictim()

			await settingNodes.recycleBin().click()
			await expect(recycleBinView.empty()).toBeEnabled()
			await recycleBinView.empty().click()
			await expect(emptyRecycleBinDialog.container()).toBeVisible()
			await emptyRecycleBinDialog.okButton().click()

			await expect(note.items('Victim')).toHaveCount(0)
			await expect(recycleBinView.empty()).toBeDisabled()
		})
	})

	test('empty recycle bin removes all contents permanently', async () => {
		await withMimiriContext(async () => {
			await setup()
			await recycleVictim()

			await settingNodes.recycleBin().click({ button: 'right' })
			await menu.emptyRecycleBin().click()
			await expect(emptyRecycleBinDialog.container()).toBeVisible()
			await emptyRecycleBinDialog.okButton().click()

			await expect(note.item('Victim')).not.toBeVisible()
			await expect(note.item('Keep Parent')).toBeVisible()
		})
	})
})
