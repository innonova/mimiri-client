import { expect, Locator } from '@playwright/test'
import { mimiri } from '../framework/mimiri-context'
import { appMain, editor, emptyRecycleBinDialog, mainToolbar, menu, note, settingNodes, statusBar } from '../selectors'
import {
	complexTestTree,
	complexTestTreeAfterCopy,
	complexTestTreeAfterMove,
	StandardTreeNode,
	testTree,
	testTreeAfterCopy,
	testTreeAfterMove,
} from './data'
import { waitForSyncToEnd } from '../core/actions'
import { ensureEditorMode } from '../editor/mode'

export interface CreateTreeOptions {
	verify?: boolean
	typeText?: boolean
}

export const replaceTextInEditor = async (text: string) => {
	await mimiri().page.evaluate(text => {
		;(globalThis as any).navigator.clipboard.writeText(text)
	}, text)

	await ensureEditorMode('code')
	await editor.monaco().click()
	await expect(editor.monaco()).toHaveClass(/\bfocused\b/)
	await mimiri().page.keyboard.press('Control+a')
	await mimiri().page.keyboard.press('Control+v')
}

export const getTextFromEditor = async () => {
	await ensureEditorMode('code')
	await editor.monaco().click()
	await expect(editor.monaco()).toHaveClass(/\bfocused\b/)
	await mimiri().page.keyboard.press('Control+a')
	await mimiri().waitForTimeout(250)
	await mimiri().page.keyboard.press('Control+c')
	return await mimiri().page.evaluate(() => (globalThis as any).navigator.clipboard.readText())
}

// Click a tree note and verify the selection actually landed on it. Under
// heavy sync load tree rows can shift or briefly disappear mid-click, which
// silently selects the wrong note (or nothing) — retry until it sticks.
export const selectNote = async (title: string, parent?: Locator) => {
	await expect(async () => {
		await note.item(title, parent).click({ timeout: 2000 })
		await expect(note.selectedItem()).toContainText(title, { timeout: 1000 })
	}).toPass({ timeout: 30000 })
}

export const createRootNote = async (name: string, text?: string, options: CreateTreeOptions = {}) => {
	// The global busy overlay intercepts pointer events while an operation is in
	// flight; under parallel-worker load it can outlive the short click timeout
	await expect(appMain.busyOverlay()).not.toBeVisible()
	await mainToolbar.container().click()
	await mainToolbar.createMenu().click()
	await menu.newRootNote().click()
	await note.newInput().fill(name)
	await note.newInput().press('Enter')
	await waitForSyncToEnd()
	if (text) {
		await ensureEditorMode('code')
		await expect(editor.monaco()).toHaveText('')
		await editor.monaco().click()
		await expect(editor.monaco()).toHaveClass(/\bfocused\b/)
		if (options.typeText) {
			await mimiri().page.keyboard.type(text)
		} else {
			await mimiri().page.keyboard.insertText(text)
		}
		await mimiri().page.keyboard.press('Enter')
		await selectNote('System')
		await selectNote(name)
		if (options.verify !== false) {
			await expect(editor.monaco()).toHaveText(text.replaceAll('\n', ''))
		}
	}
	await waitForSyncToEnd()
}

export const createChildNote = async (name: string, text?: string, options: CreateTreeOptions = {}) => {
	await expect(appMain.busyOverlay()).not.toBeVisible()
	await mainToolbar.container().click()
	await mainToolbar.createMenu().click()
	await menu.newChildNote().click()
	await note.newInput().fill(name)
	await note.newInput().press('Enter')
	await waitForSyncToEnd()
	if (text) {
		await ensureEditorMode('code')
		// Wait for the editor to actually switch to the freshly created (empty)
		// note — the switch is async (save-then-open) and typing before it
		// completes puts the text into the previously open note
		await expect(editor.monaco()).toHaveText('')
		await editor.monaco().click()
		await expect(editor.monaco()).toHaveClass(/\bfocused\b/)
		if (options.typeText) {
			await mimiri().page.keyboard.type(text)
		} else {
			await mimiri().page.keyboard.insertText(text)
		}
		await mimiri().page.keyboard.press('Enter')
		await selectNote('System')
		await selectNote(name)
		if (options.verify !== false) {
			await expect(editor.monaco()).toHaveText(text.replaceAll('\n', ''))
		}
	}
	await waitForSyncToEnd()
}

export const createSiblingNote = async (name: string, text?: string, options: CreateTreeOptions = {}) => {
	await expect(appMain.busyOverlay()).not.toBeVisible()
	await mainToolbar.container().click()
	await mainToolbar.createMenu().click()
	await menu.newSiblingNote().click()
	await note.newInput().fill(name)
	await note.newInput().press('Enter')
	await waitForSyncToEnd()
	if (text) {
		await ensureEditorMode('code')
		// Wait for the editor to actually switch to the freshly created (empty)
		// note — the switch is async (save-then-open) and typing before it
		// completes puts the text into the previously open note
		await expect(editor.monaco()).toHaveText('')
		await editor.monaco().click()
		await expect(editor.monaco()).toHaveClass(/\bfocused\b/)
		if (options.typeText) {
			await mimiri().page.keyboard.type(text)
		} else {
			await mimiri().page.keyboard.insertText(text)
		}
		await mimiri().page.keyboard.press('Enter')
		await selectNote('System')
		await selectNote(name)
		if (options.verify !== false) {
			await expect(editor.monaco()).toHaveText(text.replaceAll('\n', ''))
		}
	}
	await waitForSyncToEnd()
}

export const createTestTree = async (tree: StandardTreeNode[], options: CreateTreeOptions = {}) => {
	for (const root of tree) {
		await createRootNote(root.title, root.text, options)
		if (root.children) {
			const createChildren = async (parent: StandardTreeNode, children: StandardTreeNode[]) => {
				let first = true
				for (const child of children) {
					if (first) {
						first = false
						await createChildNote(child.title, child.text, options)
					} else {
						await createSiblingNote(child.title, child.text, options)
					}
					if (child.children) {
						await createChildren(child, child.children)
						await selectNote(parent.title)
						first = true
					}
				}
			}
			await createChildren(root, root.children)
		}
	}
	await editor.save().click()
	await waitForSyncToEnd()
}

export const verifyTestTree = async (tree: StandardTreeNode[]) => {
	for (const root of tree) {
		await selectNote(root.title)
		if (await note.expand(root.title).isVisible({ timeout: 2000 })) {
			await note.expand(root.title).click()
		}
		if (root.text) {
			await ensureEditorMode('code')
			await editor.monaco().waitFor({ state: 'visible' })
			await expect(editor.monaco()).toHaveText(root.text)
		}
		if (root.children) {
			const verifyChildren = async (parent: Locator, children: StandardTreeNode[]) => {
				for (const child of children) {
					await selectNote(child.title, parent)
					if (await note.expand(child.title, parent).isVisible({ timeout: 2000 })) {
						await note.expand(child.title, parent).click()
					}
					if (child.text) {
						await ensureEditorMode('code')
						await expect(editor.monaco()).toHaveText(child.text)
					}
					if (child.children) {
						await verifyChildren(note.container(child.title, parent), child.children)
					}
				}
			}
			await verifyChildren(note.container(root.title), root.children)
		}
	}
}

export const verifyMoveNote = async () => {
	await createTestTree(testTree)
	await verifyTestTree(testTree)
	await note.item('Item A1').click({ button: 'right' })
	await menu.cut().click()
	await note.item('Target Folder').click({ button: 'right' })
	await menu.paste().click()
	await verifyTestTree(testTreeAfterMove)
}

export const verifyCopyNote = async () => {
	await createTestTree(testTree)
	await verifyTestTree(testTree)
	await note.item('Copyable Item').click({ button: 'right' })
	await menu.copy().click()
	await note.item('Folder 2').click({ button: 'right' })
	await menu.paste().click()
	await verifyTestTree(testTreeAfterCopy)
}

export const verifyComplexMoveNote = async () => {
	await createTestTree(complexTestTree)
	await verifyTestTree(complexTestTree)
	await note.item('Level 3 Folder').click({ button: 'right' })
	await menu.cut().click()
	await note.item('Complex Target').click({ button: 'right' })
	await menu.paste().click()
	await verifyTestTree(complexTestTreeAfterMove)
}

export const verifyComplexCopyNote = async () => {
	await createTestTree(complexTestTree)
	await verifyTestTree(complexTestTree)
	await note.item('Branch 1').click({ button: 'right' })
	await menu.copy().click()
	await note.item('Level 1 Target Area').click({ button: 'right' })
	await menu.paste().click()
	await verifyTestTree(complexTestTreeAfterCopy)
}

export const verifyMoveNoteIntoOwnChild = async () => {
	await createTestTree(complexTestTree)
	await verifyTestTree(complexTestTree)
	// Attempt to move "Level 1 Folder" into its own child "Level 2 Folder A"
	// This should have no effect and the tree should remain unchanged
	await note.item('Level 1 Folder').click({ button: 'right' })
	await menu.cut().click()
	await note.item('Level 2 Folder A').click({ button: 'right' })
	await menu.paste().click()
	// Tree should remain exactly the same as the original
	await verifyTestTree(complexTestTree)
}

export const deleteAllNotes = async () => {
	let didDelete = false
	while (true) {
		await note.item('Getting Started').click()
		await mimiri().page.keyboard.press('ArrowDown')
		const text = await note.selectedItem().textContent()
		if (text === 'Getting Started') {
			break
		}
		await note.selectedItem().click({ button: 'right' })
		await menu.recycle().click()
		didDelete = true
	}
	if (didDelete) {
		await settingNodes.recycleBin().click({ button: 'right' })
		await menu.emptyRecycleBin().click()
		await emptyRecycleBinDialog.okButton().click()
		await expect(statusBar.syncStatusCode()).toHaveValue(
			/idle|total-size-limit-exceeded|count-limit-exceeded|note-size-limit-exceeded|server-rejection|synchronization-error/,
		)
	}
}
