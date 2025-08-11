import { expect, test } from '@playwright/test'
import { mimiri, mimiriClone, mimiriCreate, withMimiriContext } from './framework/mimiri-context'
import { acceptShareDialog, editor, menu, note, settingNodes, shareDialog, titleBar } from './selectors'
import {
	createChildNote,
	createRootNote,
	createSiblingNote,
	createTestTree,
	verifyTestTree,
	verifyMoveNote,
	verifyCopyNote,
	verifyComplexMoveNote,
	verifyComplexCopyNote,
	verifyMoveNoteIntoOwnChild,
} from './notes/actions'
import {
	receiveShareTestTree,
	receiveShareTestTreeAfterSingleNote,
	receiveShareTestTreeAfterFolder,
	receiveShareTestTreeAfterMultiple,
	receiveShareTestTreeAfterMixed,
	shareTestTree,
	standardTree,
} from './notes/data'
import { createCloudAccount, login, logout } from './core/actions'

// test.describe.configure({ mode: 'serial' })

test.describe('cloud account', () => {
	test('verify online', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await expect(titleBar.accountButton()).toHaveAttribute('title', 'Account (Online)')
			await titleBar.accountButton().click()
			await expect(menu.createAccount()).not.toBeVisible()
			await expect(menu.login()).not.toBeVisible()
			await expect(menu.logout()).toBeVisible()
			await expect(menu.workOffline()).toBeVisible()
		})
	})

	test('verify expected api calls', async () => {
		await withMimiriContext(async () => {
			let apiCallCount = 0
			let blogCallCount = 0
			await mimiri().page.route('https://dev-api.mimiri.io/api/**', route => {
				apiCallCount++
				void route.continue()
			})
			await mimiri().page.route('https://dev-mimiri-api.mimiri.io/blog/**', route => {
				blogCallCount++
				void route.continue()
			})
			await mimiri().home()
			await createCloudAccount()
			await titleBar.accountButton().click()
			await expect(menu.createAccount()).not.toBeVisible()
			await expect(menu.login()).not.toBeVisible()
			await expect(menu.logout()).toBeVisible()
			await expect(menu.workOffline()).toBeVisible()
			await mimiri().page.waitForTimeout(1000)
			await expect(apiCallCount).toBeGreaterThan(5)
			await expect(blogCallCount).toBe(2)
		})
	})

	test('verify note create and save to work', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await createRootNote('Test Note')
			await createChildNote('Test Child Note')
			await createSiblingNote('Test Sibling Note')
			await note.item('Test Child Note').click()
			await createChildNote('Test Child Note 2')
			await expect(editor.monaco()).toHaveClass(/\bfocused\b/)
			await mimiri().page.keyboard.type('Test Child Note 2 content')
			await editor.save().click()
			await expect(editor.monaco()).toHaveText('Test Child Note 2 content')
			await mimiri().reload()
			await expect(editor.monaco()).toHaveText('Test Child Note 2 content')
		})
	})

	test('verify that share options are available', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await createRootNote('Test Note')
			await createChildNote('Test Child Note')
			await note.item('Test Child Note').click({ button: 'right' })
			await expect(menu.properties()).toBeVisible()
			await expect(menu.share()).toBeVisible()
			await expect(menu.receiveShare()).not.toBeVisible()
			await expect(menu.receiveShareUnder()).toBeVisible()
			await menu.backdrop().click()
			await titleBar.file().click()
			await expect(menu.newRootNote()).toBeVisible()
			await expect(menu.share()).not.toBeVisible()
			await expect(menu.receiveShare()).toBeVisible()
			await expect(menu.receiveShareUnder()).not.toBeVisible()
			await menu.backdrop().click()
			await titleBar.edit().click()
			await expect(menu.rename()).toBeVisible()
			await expect(menu.share()).toBeVisible()
			await expect(menu.receiveShare()).not.toBeVisible()
			await expect(menu.receiveShareUnder()).not.toBeVisible()
			await menu.backdrop().click()
		})
	})

	test('verify that settings has appropriate options', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await settingNodes.controlPanel().dblclick()
			await expect(settingNodes.settingGroup()).toBeVisible()
			await expect(settingNodes.update()).toBeVisible()
			await expect(settingNodes.blog()).toBeVisible()
			await expect(settingNodes.createAccount()).not.toBeVisible()
			await expect(settingNodes.settingGroup()).toBeVisible()
			await settingNodes.settingGroup().dblclick()
			await expect(settingNodes.general()).toBeVisible()
			await expect(settingNodes.fontsAndColors()).toBeVisible()
			await expect(settingNodes.pin()).toBeVisible()
			await expect(settingNodes.account()).toBeVisible()
			await settingNodes.account().dblclick()
			await expect(settingNodes.connectCloud()).not.toBeVisible()
			await expect(settingNodes.username()).toBeVisible()
			await expect(settingNodes.password()).toBeVisible()
			await expect(settingNodes.delete()).toBeVisible()
		})
	})

	test('verify create standard test tree', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await createTestTree(standardTree)
			await verifyTestTree(standardTree)
			await mimiri().reload()
			await expect(titleBar.accountButton()).toBeVisible()
			await verifyTestTree(standardTree)
			await logout()
			await login()
			await verifyTestTree(standardTree)

			await mimiriClone(true)
			await mimiri().home()
			await login()
			await expect(titleBar.accountButton()).toBeVisible()
			await expect(titleBar.accountButton()).toHaveAttribute('title', 'Account (Online)')
			await verifyTestTree(standardTree)
		})
	})

	test('verify move note', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await verifyMoveNote()
		})
	})

	test('verify copy note', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await verifyCopyNote()
		})
	})

	test('verify complex move note with multiple levels', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await verifyComplexMoveNote()
		})
	})

	test('verify complex copy note with multiple levels', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await verifyComplexCopyNote()
		})
	})

	test('verify move note into its own child has no effect', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await verifyMoveNoteIntoOwnChild()
		})
	})
})
