import { expect, Locator } from '@playwright/test'
import { mimiri } from '../framework/mimiri-context'
import { editor, mainToolbar, menu, note } from '../selectors'
import {
	complexTestTree,
	complexTestTreeAfterCopy,
	complexTestTreeAfterMove,
	StandardTreeNode,
	testTree,
	testTreeAfterCopy,
	testTreeAfterMove,
} from './data'

export const createRootNote = async (name: string, text?: string) => {
	await mainToolbar.container().click()
	await mainToolbar.createMenu().click()
	await menu.newRootNote().click()
	await note.newInput().fill(name)
	await note.newInput().press('Enter')
	if (text) {
		await expect(editor.monaco()).toHaveClass(/\bfocused\b/)
		await mimiri().page.keyboard.type(text)
		await mimiri().page.keyboard.press('Enter')
	}
}

export const createChildNote = async (name: string, text?: string) => {
	await mainToolbar.container().click()
	await mainToolbar.createMenu().click()
	await menu.newChildNote().click()
	await note.newInput().fill(name)
	await note.newInput().press('Enter')
	if (text) {
		await expect(editor.monaco()).toHaveClass(/\bfocused\b/)
		await mimiri().page.keyboard.type(text)
		await mimiri().page.keyboard.press('Enter')
	}
}

export const createSiblingNote = async (name: string, text?: string) => {
	await mainToolbar.container().click()
	await mainToolbar.createMenu().click()
	await menu.newSiblingNote().click()
	await note.newInput().fill(name)
	await note.newInput().press('Enter')
	if (text) {
		await expect(editor.monaco()).toHaveClass(/\bfocused\b/)
		await mimiri().page.keyboard.type(text)
		await mimiri().page.keyboard.press('Enter')
	}
}

export const createTestTree = async (tree: StandardTreeNode[]) => {
	for (const root of tree) {
		await createRootNote(root.title, root.text)
		await editor.save().click()
		if (root.children) {
			const createChildren = async (parent: StandardTreeNode, children: StandardTreeNode[]) => {
				let first = true
				for (const child of children) {
					if (first) {
						first = false
						await createChildNote(child.title, child.text)
						await editor.save().click()
					} else {
						await createSiblingNote(child.title, child.text)
						await editor.save().click()
					}
					if (child.children) {
						await createChildren(child, child.children)
						await editor.save().click()
						await note.item(parent.title).click()
						first = true
					}
				}
			}
			await createChildren(root, root.children)
		}
	}
	await editor.save().click()
}

export const verifyTestTree = async (tree: StandardTreeNode[]) => {
	for (const root of tree) {
		await note.item(root.title).click()
		if (await note.expand(root.title).isVisible()) {
			await note.expand(root.title).click()
		}
		if (root.text) {
			await editor.monaco().waitFor({ state: 'visible' })
			await expect(editor.monaco()).toHaveText(root.text)
		}
		if (root.children) {
			const verifyChildren = async (parent: Locator, children: StandardTreeNode[]) => {
				for (const child of children) {
					await note.item(child.title, parent).click()
					if (await note.expand(child.title, parent).isVisible()) {
						await note.expand(child.title, parent).click()
					}
					if (child.text) {
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
