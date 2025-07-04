import { expect, test } from '@playwright/test'
import { mimiri, mimiriClone, mimiriCreate, withMimiriContext } from './framework/mimiri-context'
import { aboutView, editor, loginCtrl, menu, note, settingNodes, settingView, titleBar } from './selectors'
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
import { standardTree } from './notes/data'
import { createCloudAccount, createLocalAccount, login, logout } from './core/actions'

// test.describe.configure({ mode: 'serial' })

test.describe('account-less', () => {
	test('verify offline', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await expect(titleBar.accountButton()).toHaveAttribute('title', 'Account (Offline)')
			await titleBar.accountButton().click()
			await expect(menu.createAccount()).toBeVisible()
			await expect(menu.login()).toBeVisible()
			await expect(menu.logout()).not.toBeVisible()
			await expect(menu.workOffline()).not.toBeVisible()
		})
	})

	test('verify expected api calls', async () => {
		await withMimiriContext(async () => {
			let apiCallCount = 0
			let blogCallCount = 0
			await mimiri().page.route('https://dev-api.mimiri.io/api/**', route => {
				apiCallCount++
				route.continue()
			})
			await mimiri().page.route('https://dev-mimiri-api.mimiri.io/blog/**', route => {
				blogCallCount++
				route.continue()
			})
			await mimiri().home()
			await titleBar.accountButton().click()
			await expect(menu.createAccount()).toBeVisible()
			await mimiri().page.waitForTimeout(1000)
			await expect(apiCallCount).toBe(0)
			await expect(blogCallCount).toBe(1)
		})
	})

	test('verify note create and save to work', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
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

	test('verify that no share options are available', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createRootNote('Test Note')
			await createChildNote('Test Child Note')
			await note.item('Test Child Note').click({ button: 'right' })
			await expect(menu.properties()).toBeVisible()
			await expect(menu.share()).not.toBeVisible()
			await expect(menu.receiveShare()).not.toBeVisible()
			await expect(menu.receiveShareUnder()).not.toBeVisible()
			await menu.backdrop().click()
			await titleBar.file().click()
			await expect(menu.newRootNote()).toBeVisible()
			await expect(menu.share()).not.toBeVisible()
			await expect(menu.receiveShare()).not.toBeVisible()
			await expect(menu.receiveShareUnder()).not.toBeVisible()
			await menu.backdrop().click()
			await titleBar.edit().click()
			await expect(menu.rename()).toBeVisible()
			await expect(menu.share()).not.toBeVisible()
			await expect(menu.receiveShare()).not.toBeVisible()
			await expect(menu.receiveShareUnder()).not.toBeVisible()
			await menu.backdrop().click()
		})
	})

	test('verify that settings has appropriate options', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await settingNodes.controlPanel().dblclick()
			await expect(settingNodes.settingGroup()).toBeVisible()
			await expect(settingNodes.update()).toBeVisible()
			await expect(settingNodes.blog()).toBeVisible()
			await settingNodes.settingGroup().dblclick()
			await expect(settingNodes.general()).toBeVisible()
			await expect(settingNodes.fontsAndColors()).toBeVisible()
			await expect(settingNodes.pin()).not.toBeVisible()
			await expect(settingNodes.createAccount()).toBeVisible()
			await expect(settingNodes.subscriptionGroup()).not.toBeVisible()
			await settingNodes.createAccount().click()
			await expect(settingView.cloudAccount()).toBeVisible()
			await expect(settingView.localAccount()).toBeVisible()
		})
	})

	test('verify create standard test tree', async () => {
		test.setTimeout(120000)
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createTestTree(standardTree)
			await verifyTestTree(standardTree)
			await mimiri().reload()
			await expect(titleBar.accountButton()).toBeVisible()
			await verifyTestTree(standardTree)
		})
	})

	test('verify move note', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await verifyMoveNote()
		})
	})

	test('verify copy note', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await verifyCopyNote()
		})
	})

	test('verify complex move note with multiple levels', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await verifyComplexMoveNote()
		})
	})

	test('verify complex copy note with multiple levels', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await verifyComplexCopyNote()
		})
	})

	test('verify move note into its own child has no effect', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await verifyMoveNoteIntoOwnChild()
		})
	})

	test('upgrade to local account', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createTestTree(standardTree)
			await verifyTestTree(standardTree)
			await createLocalAccount()
			await verifyTestTree(standardTree)
			await logout()
			await login()
			await verifyTestTree(standardTree)
		})
	})

	test('upgrade to cloud account', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createTestTree(standardTree)
			await verifyTestTree(standardTree)
			await createCloudAccount()
			await verifyTestTree(standardTree)
			await logout()
			await login()
			await verifyTestTree(standardTree)
			await mimiriClone(true)
			await mimiri().home()
			await login()
			await verifyTestTree(standardTree)
		})
	})
})
