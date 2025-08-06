import { expect, test } from '@playwright/test'
import { mimiri, mimiriCreate, withMimiriContext } from './framework/mimiri-context'
import {
	aboutView,
	acceptShareDialog,
	deleteNoteDialog,
	menu,
	note,
	settingNodes,
	shareDialog,
	textNoteProperties,
	titleBar,
} from './selectors'
import { createTestTree, verifyTestTree } from './notes/actions'
import {
	receiveShareTestTree,
	receiveShareTestTreeAfterSingleNote,
	receiveShareTestTreeAfterFolder,
	receiveShareTestTreeAfterMultiple,
	receiveShareTestTreeAfterMixed,
	shareTestTree,
} from './notes/data'
import { createCloudAccount } from './core/actions'

// test.describe.configure({ mode: 'serial' })

test.describe('sharing', () => {
	test('share note with another user', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await createTestTree(shareTestTree)
			await verifyTestTree(shareTestTree)

			await mimiriCreate(true)
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await createTestTree(receiveShareTestTree)
			await verifyTestTree(receiveShareTestTree)
			const targetUsername = mimiri().username

			mimiri(0, true)
			await verifyTestTree(shareTestTree)
			await note.item('Single Shareable Note').click({ button: 'right' })
			await menu.share().click()
			await shareDialog.username().fill(targetUsername)
			await shareDialog.okButton().click()
			await expect(shareDialog.code()).toBeVisible()
			const shareCode = (await shareDialog.code().textContent()) ?? ''
			await shareDialog.closeButton().click()
			mimiri(1, true)
			await note.item('Collaboration Hub').click({ button: 'right' })
			await menu.receiveShareUnder().click()
			await acceptShareDialog.code().fill(shareCode)
			await acceptShareDialog.okButton().click()
			await expect(acceptShareDialog.container()).not.toBeVisible()
			await verifyTestTree(receiveShareTestTreeAfterSingleNote)
		})
	})

	test('share folder with children to another user', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await createTestTree(shareTestTree)
			await verifyTestTree(shareTestTree)

			await mimiriCreate(true)
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await createTestTree(receiveShareTestTree)
			await verifyTestTree(receiveShareTestTree)
			const targetUsername = mimiri().username

			mimiri(0, true)
			await verifyTestTree(shareTestTree)
			await note.item('Team Handbook').click({ button: 'right' })
			await menu.share().click()
			await shareDialog.username().fill(targetUsername)
			await shareDialog.okButton().click()
			await expect(shareDialog.code()).toBeVisible()
			const shareCode = (await shareDialog.code().textContent()) ?? ''
			await shareDialog.closeButton().click()

			mimiri(1, true)
			await note.item('Shared Projects').click({ button: 'right' })
			await menu.receiveShareUnder().click()
			await acceptShareDialog.code().fill(shareCode)
			await acceptShareDialog.okButton().click()
			await expect(acceptShareDialog.container()).not.toBeVisible()
			await verifyTestTree(receiveShareTestTreeAfterFolder)
		})
	})

	test('share multiple items to different locations', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await createTestTree(shareTestTree)
			await verifyTestTree(shareTestTree)

			await mimiriCreate(true)
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await createTestTree(receiveShareTestTree)
			await verifyTestTree(receiveShareTestTree)
			const targetUsername = mimiri().username

			// Share API Documentation to Collaboration Hub
			mimiri(0, true)
			await note.item('API Documentation').click({ button: 'right' })
			await menu.share().click()
			await shareDialog.username().fill(targetUsername)
			await shareDialog.okButton().click()
			await expect(shareDialog.code()).toBeVisible()
			const apiDocShareCode = (await shareDialog.code().textContent()) ?? ''
			await shareDialog.closeButton().click()

			// Share Market Analysis to Archive
			await note.item('Market Analysis').click({ button: 'right' })
			await menu.share().click()
			await shareDialog.username().fill(targetUsername)
			await shareDialog.okButton().click()
			await expect(shareDialog.code()).toBeVisible()
			const marketAnalysisShareCode = (await shareDialog.code().textContent()) ?? ''
			await shareDialog.closeButton().click()

			// Receive both shares
			mimiri(1, true)
			await note.item('Collaboration Hub').click({ button: 'right' })
			await menu.receiveShareUnder().click()
			await acceptShareDialog.code().fill(apiDocShareCode)
			await acceptShareDialog.okButton().click()
			await expect(acceptShareDialog.container()).not.toBeVisible()

			await note.item('Archive').click({ button: 'right' })
			await menu.receiveShareUnder().click()
			await acceptShareDialog.code().fill(marketAnalysisShareCode)
			await acceptShareDialog.okButton().click()
			await expect(acceptShareDialog.container()).not.toBeVisible()

			await verifyTestTree(receiveShareTestTreeAfterMultiple)
		})
	})

	test('share mixed content types to existing folders', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await createTestTree(shareTestTree)
			await verifyTestTree(shareTestTree)
			await mimiriCreate(true)
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await createTestTree(receiveShareTestTree)
			await verifyTestTree(receiveShareTestTree)
			const targetUsername = mimiri().username

			// Share multiple different types of content
			mimiri(0, true)

			// Share single note to Shared Projects
			await note.item('Project Proposal Template').click({ button: 'right' })
			await menu.share().click()
			await shareDialog.username().fill(targetUsername)
			await shareDialog.okButton().click()
			await expect(shareDialog.code()).toBeVisible()
			const proposalShareCode = (await shareDialog.code().textContent()) ?? ''
			await shareDialog.closeButton().click()

			// Share folder with children to Shared Projects
			await note.item('Development Guidelines').click({ button: 'right' })
			await menu.share().click()
			await shareDialog.username().fill(targetUsername)
			await shareDialog.okButton().click()
			await expect(shareDialog.code()).toBeVisible()
			const devGuidelinesShareCode = (await shareDialog.code().textContent()) ?? ''
			await shareDialog.closeButton().click()

			// Share single notes to Collaboration Hub
			await note.item('Support Contact Info').click({ button: 'right' })
			await menu.share().click()
			await shareDialog.username().fill(targetUsername)
			await shareDialog.okButton().click()
			await expect(shareDialog.code()).toBeVisible()
			const supportShareCode = (await shareDialog.code().textContent()) ?? ''
			await shareDialog.closeButton().click()

			await note.item('Technology Trends').click({ button: 'right' })
			await menu.share().click()
			await shareDialog.username().fill(targetUsername)
			await shareDialog.okButton().click()
			await expect(shareDialog.code()).toBeVisible()
			const trendsShareCode = (await shareDialog.code().textContent()) ?? ''
			await shareDialog.closeButton().click()

			// Receive all shares
			mimiri(1, true)

			// Receive into Shared Projects
			await note.item('Shared Projects').click({ button: 'right' })
			await menu.receiveShareUnder().click()
			await acceptShareDialog.code().fill(proposalShareCode)
			await acceptShareDialog.okButton().click()
			await expect(acceptShareDialog.container()).not.toBeVisible()

			await note.item('Shared Projects').click({ button: 'right' })
			await menu.receiveShareUnder().click()
			await acceptShareDialog.code().fill(devGuidelinesShareCode)
			await acceptShareDialog.okButton().click()
			await expect(acceptShareDialog.container()).not.toBeVisible()

			// Receive into Collaboration Hub
			await note.item('Collaboration Hub').click({ button: 'right' })
			await menu.receiveShareUnder().click()
			await acceptShareDialog.code().fill(supportShareCode)
			await acceptShareDialog.okButton().click()
			await expect(acceptShareDialog.container()).not.toBeVisible()

			await note.item('Collaboration Hub').click({ button: 'right' })
			await menu.receiveShareUnder().click()
			await acceptShareDialog.code().fill(trendsShareCode)
			await acceptShareDialog.okButton().click()
			await expect(acceptShareDialog.container()).not.toBeVisible()

			await verifyTestTree(receiveShareTestTreeAfterMixed)
		})
	})

	test('leave share (recipient)', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await createTestTree(shareTestTree)
			await verifyTestTree(shareTestTree)
			const sourceUsername = mimiri().username

			await mimiriCreate(true)
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await createTestTree(receiveShareTestTree)
			await verifyTestTree(receiveShareTestTree)
			const targetUsername = mimiri().username

			mimiri(0, true)
			await verifyTestTree(shareTestTree)
			await note.item('Team Handbook').click({ button: 'right' })
			await menu.share().click()
			await shareDialog.username().fill(targetUsername)
			await shareDialog.okButton().click()
			await expect(shareDialog.code()).toBeVisible()
			const shareCode = (await shareDialog.code().textContent()) ?? ''
			await shareDialog.closeButton().click()

			await settingNodes.controlPanel().click()
			await expect(aboutView.noteCount()).toHaveText('25')

			mimiri(1, true)
			await note.item('Shared Projects').click({ button: 'right' })
			await menu.receiveShareUnder().click()
			await acceptShareDialog.code().fill(shareCode)
			await acceptShareDialog.okButton().click()
			await expect(acceptShareDialog.container()).not.toBeVisible()
			await verifyTestTree(receiveShareTestTreeAfterFolder)

			await settingNodes.controlPanel().click()
			await expect(aboutView.noteCount()).toHaveText('19')

			await note.item('Team Handbook').click({ button: 'right' })
			await menu.properties().click()
			await expect(textNoteProperties.shareParticipantUsername()).toHaveText(sourceUsername)

			mimiri(0, true)
			await note.item('Team Handbook').click({ button: 'right' })
			await menu.properties().click()
			await expect(textNoteProperties.shareParticipantUsername()).toHaveText(targetUsername)

			mimiri(1, true)
			await note.item('Team Handbook').click({ button: 'right' })
			await menu.delete().click()
			await expect(deleteNoteDialog.leaveShare()).toBeVisible()
			await deleteNoteDialog.confirmLeaveButton().click()

			await settingNodes.controlPanel().click()
			await expect(aboutView.noteCount()).toHaveText('13')

			mimiri(0, true)
			await note.item('Team Handbook').click()
			await note.item('Team Handbook').click({ button: 'right' })
			await menu.properties().click()
			await expect(textNoteProperties.noShareParticipants()).toBeVisible()
			await expect(textNoteProperties.shareParticipantUsername()).toHaveCount(0)

			await settingNodes.controlPanel().click()
			await expect(aboutView.noteCount()).toHaveText('25')

			await mimiri().reload()
			await note.item('Team Handbook').click()
			await note.item('Team Handbook').click({ button: 'right' })
			await menu.properties().click()
			await expect(textNoteProperties.noShareParticipants()).toBeVisible()
			await expect(textNoteProperties.shareParticipantUsername()).toHaveCount(0)
			await settingNodes.controlPanel().click()
			await expect(aboutView.noteCount()).toHaveText('25')
			await verifyTestTree(shareTestTree)
		})
	})

	test('leave share (sender)', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await createTestTree(shareTestTree)
			await verifyTestTree(shareTestTree)
			const sourceUsername = mimiri().username

			await mimiriCreate(true)
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await createTestTree(receiveShareTestTree)
			await verifyTestTree(receiveShareTestTree)
			const targetUsername = mimiri().username

			mimiri(0, true)
			await verifyTestTree(shareTestTree)
			await note.item('Team Handbook').click({ button: 'right' })
			await menu.share().click()
			await shareDialog.username().fill(targetUsername)
			await shareDialog.okButton().click()
			await expect(shareDialog.code()).toBeVisible()
			const shareCode = (await shareDialog.code().textContent()) ?? ''
			await shareDialog.closeButton().click()

			await settingNodes.controlPanel().click()
			await expect(aboutView.noteCount()).toHaveText('25')

			mimiri(1, true)
			await note.item('Shared Projects').click({ button: 'right' })
			await menu.receiveShareUnder().click()
			await acceptShareDialog.code().fill(shareCode)
			await acceptShareDialog.okButton().click()
			await expect(acceptShareDialog.container()).not.toBeVisible()
			await verifyTestTree(receiveShareTestTreeAfterFolder)

			await settingNodes.controlPanel().click()
			await expect(aboutView.noteCount()).toHaveText('19')

			await note.item('Team Handbook').click({ button: 'right' })
			await menu.properties().click()
			await expect(textNoteProperties.shareParticipantUsername()).toHaveText(sourceUsername)

			mimiri(0, true)
			await note.item('Team Handbook').click({ button: 'right' })
			await menu.properties().click()
			await expect(textNoteProperties.shareParticipantUsername()).toHaveText(targetUsername)

			await note.item('Team Handbook').click({ button: 'right' })
			await menu.delete().click()
			await expect(deleteNoteDialog.leaveShare()).toBeVisible()
			await deleteNoteDialog.confirmLeaveButton().click()

			await settingNodes.controlPanel().click()
			await expect(aboutView.noteCount()).toHaveText('19')

			mimiri(1, true)
			await settingNodes.controlPanel().click()
			await expect(aboutView.noteCount()).toHaveText('19')
			await note.item('Team Handbook').click({ button: 'right' })
			await menu.properties().click()
			await expect(textNoteProperties.noShareParticipants()).toBeVisible()
			await expect(textNoteProperties.shareParticipantUsername()).toHaveCount(0)

			await mimiri().reload()
			await note.item('Team Handbook').click()
			await note.item('Team Handbook').click({ button: 'right' })
			await menu.properties().click()
			await expect(textNoteProperties.noShareParticipants()).toBeVisible()
			await expect(textNoteProperties.shareParticipantUsername()).toHaveCount(0)
			await settingNodes.controlPanel().click()
			await expect(aboutView.noteCount()).toHaveText('19')
		})
	})

	test('leave and delete share', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await createTestTree(shareTestTree)
			await verifyTestTree(shareTestTree)
			const sourceUsername = mimiri().username

			await mimiriCreate(true)
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await createTestTree(receiveShareTestTree)
			await verifyTestTree(receiveShareTestTree)
			const targetUsername = mimiri().username

			mimiri(0, true)
			await verifyTestTree(shareTestTree)
			await note.item('Team Handbook').click({ button: 'right' })
			await menu.share().click()
			await shareDialog.username().fill(targetUsername)
			await shareDialog.okButton().click()
			await expect(shareDialog.code()).toBeVisible()
			const shareCode = (await shareDialog.code().textContent()) ?? ''
			await shareDialog.closeButton().click()

			await settingNodes.controlPanel().click()
			await expect(aboutView.noteCount()).toHaveText('25')

			mimiri(1, true)
			await note.item('Shared Projects').click({ button: 'right' })
			await menu.receiveShareUnder().click()
			await acceptShareDialog.code().fill(shareCode)
			await acceptShareDialog.okButton().click()
			await expect(acceptShareDialog.container()).not.toBeVisible()
			await verifyTestTree(receiveShareTestTreeAfterFolder)

			await settingNodes.controlPanel().click()
			await expect(aboutView.noteCount()).toHaveText('19')

			await note.item('Team Handbook').click({ button: 'right' })
			await menu.properties().click()
			await expect(textNoteProperties.shareParticipantUsername()).toHaveText(sourceUsername)

			mimiri(0, true)
			await note.item('Team Handbook').click({ button: 'right' })
			await menu.properties().click()
			await expect(textNoteProperties.shareParticipantUsername()).toHaveText(targetUsername)

			mimiri(1, true)
			await note.item('Team Handbook').click({ button: 'right' })
			await menu.delete().click()
			await expect(deleteNoteDialog.leaveShare()).toBeVisible()
			await deleteNoteDialog.confirmLeaveButton().click()

			await settingNodes.controlPanel().click()
			await expect(aboutView.noteCount()).toHaveText('13')

			mimiri(0, true)
			await note.item('Team Handbook').click()
			await note.item('Team Handbook').click({ button: 'right' })
			await menu.properties().click()
			await expect(textNoteProperties.noShareParticipants()).toBeVisible()
			await expect(textNoteProperties.shareParticipantUsername()).toHaveCount(0)

			await settingNodes.controlPanel().click()
			await expect(aboutView.noteCount()).toHaveText('25')

			await note.item('Team Handbook').click({ button: 'right' })
			await menu.delete().click()
			await expect(deleteNoteDialog.deleteNote()).toBeVisible()
			await expect(deleteNoteDialog.deleteShareWithNoParticipants()).toBeVisible()
			await deleteNoteDialog.confirmButton().click()
			await settingNodes.controlPanel().click()
			await expect(aboutView.noteCount()).toHaveText('19')
		})
	})
})
