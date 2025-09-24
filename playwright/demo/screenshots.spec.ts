import { devices, expect, test } from '@playwright/test'
import { mimiri, withMimiriContext } from '../framework/mimiri-context'
import { editor, mainToolbar, menu, note, settingNodes, settingView, shareDialog } from '../selectors'
import { login } from '../core/actions'
import { historyItems } from './history-items'

const sharedNotes = [
	'Mimiri Development',
	'Sprint Planning',
	'Authentication System',
	'Technical Specs',
	'Meeting Notes',
	'Real-time Sync',
	'Mobile App',
]

const phoneDevices = [
	{
		name: 'iPhone',
		device: {
			viewport: { width: 402, height: 874 },
			userAgent: devices['iPhone 14 Pro'].userAgent,
			deviceScaleFactor: 3,
			isMobile: true,
			hasTouch: true,
		},
		safeArea: { top: '62px', bottom: '34px' },
		screenshotName: 'iphone',
	},
	{
		name: 'Android Phone',
		device: {
			viewport: { width: 412, height: 893 },
			userAgent: devices['Pixel 7'].userAgent,
			deviceScaleFactor: 3.4942,
			isMobile: true,
			hasTouch: true,
		},
		safeArea: { top: '21px', bottom: '21px' },
		screenshotName: 'android',
	},
]

const tabletDevices = [
	{
		name: 'iPad',
		device: {
			...devices['iPad Pro 12.9'],
			viewport: { width: 1376, height: 1032 },
			deviceScaleFactor: 2,
			isMobile: false,
			hasTouch: true,
		},
		safeArea: { top: '24px', bottom: '25px' },
		screenshotName: 'ipad',
	},
	{
		name: 'Android Tablet 10',
		device: {
			...devices['Nexus 10 landscape'],
			viewport: { width: 1280, height: 800 },
			deviceScaleFactor: 2,
			isMobile: false,
			hasTouch: true,
		},
		safeArea: { top: '25px', bottom: '25px' },
		screenshotName: 'tablet-10',
	},
	{
		name: 'Android Tablet 7',
		device: {
			...devices['Nexus 7 landscape'],
			viewport: { width: 960, height: 600 },
			deviceScaleFactor: 2,
			isMobile: false,
			hasTouch: true,
		},
		safeArea: { top: '25px', bottom: '25px' },
		screenshotName: 'tablet-7',
	},
]

test.describe.configure({ mode: 'serial' })

test.describe('Screenshots', () => {
	test('Desktop - Front Page', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			mimiri().config.username = 'Alice'
			mimiri().config.password = process.env.DEMO_ACCOUNT_PASSWORD!
			mimiri().config.cleanUp = false
			await login()
			await expect(settingNodes.controlPanel()).toBeVisible()
			await mimiri().resetTreeState()
			await mimiri().reload()
			await mimiri().appearShared(sharedNotes)
			await settingNodes.controlPanel().dblclick()
			await settingNodes.settingGroup().dblclick()
			await note.item('Dev Blog').click()
			await mimiri().waitForTimeout(500)
			await note.item('Work Projects').dblclick()
			await note.item('Personal').dblclick()
			await note.item('Trips & Events').dblclick()
			await note.item('Weekend Cabin Trip Planning').click()
			await mimiri().screenshot('front-page')
		})
	})

	test('Desktop - Share', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			mimiri().config.username = 'Alice'
			mimiri().config.password = process.env.DEMO_ACCOUNT_PASSWORD!
			mimiri().config.cleanUp = false
			await login()
			await mimiri().resetTreeState()
			await mimiri().reload()
			await mimiri().appearShared(sharedNotes)
			await expect(settingNodes.controlPanel()).toBeVisible()
			await settingNodes.controlPanel().dblclick()
			await note.item('Dev Blog').click()
			await mimiri().waitForTimeout(500)
			await settingNodes.controlPanel().dblclick()
			await note.item('Work Projects').dblclick()
			await note.item('Mimiri Development').click({ button: 'right' })
			await menu.share().click()
			await shareDialog.username().fill('Bob')
			await mimiri().setShareCode('4257')
			await mimiri().screenshot('share-dialog')
		})
	})

	test('Desktop - History', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			mimiri().config.username = 'Alice'
			mimiri().config.password = process.env.DEMO_ACCOUNT_PASSWORD!
			mimiri().config.cleanUp = false
			await login()
			await mimiri().resetTreeState()
			await mimiri().reload()
			await mimiri().appearShared(sharedNotes)
			await expect(settingNodes.controlPanel()).toBeVisible()
			await settingNodes.controlPanel().dblclick()
			await note.item('Dev Blog').click()
			await mimiri().waitForTimeout(500)
			await settingNodes.controlPanel().dblclick()
			await note.item('Work Projects').dblclick()
			await note.item('Mimiri Development').dblclick()
			await note.item('Sprint Planning').dblclick()
			await note.item('Authentication System').click()
			await mimiri().setHistoryEntries(historyItems)
			await editor.toggleWordWrap().click()
			await editor.history().click()
			await mimiri().screenshot('history')
		})
	})

	test('Desktop - Plan', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			mimiri().config.username = 'Alice'
			mimiri().config.password = process.env.DEMO_ACCOUNT_PASSWORD!
			mimiri().config.cleanUp = false
			await login()
			await mimiri().resetTreeState()
			await mimiri().reload()
			await mimiri().appearShared(sharedNotes)
			await expect(settingNodes.controlPanel()).toBeVisible()
			await settingNodes.controlPanel().dblclick()
			await note.item('Dev Blog').click()
			await mimiri().waitForTimeout(500)
			await note.item('Work Projects').dblclick()
			await settingNodes.subscriptionGroup().dblclick()
			await settingNodes.subscription().click()
			await mimiri().waitForTimeout(500)
			await mimiri().screenshot('plan')
		})
	})

	test('Desktop - Create Account', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(settingNodes.controlPanel()).toBeVisible()
			await note.item('Dev Blog').click()
			await mimiri().waitForTimeout(500)
			await settingNodes.createAccount().click()
			await mimiri().screenshot('cloud-account')
			await settingView.localAccount().click()
			await mimiri().screenshot('local-account')
		})
	})

	phoneDevices.forEach(({ name, device, safeArea, screenshotName }) => {
		test(`${name} - Front Page`, async () => {
			await withMimiriContext(async () => {
				await mimiri().home()
				mimiri().config.username = 'Alice'
				mimiri().config.password = process.env.DEMO_ACCOUNT_PASSWORD!
				mimiri().config.cleanUp = false
				await login()
				await expect(settingNodes.controlPanel()).toBeVisible()

				await mimiri().appearShared(sharedNotes)
				await settingNodes.controlPanel().dblclick()
				await settingNodes.settingGroup().dblclick()
				await note.item('Dev Blog').click()
				await mimiri().waitForTimeout(500)
				await note.item('Work Projects').dblclick()
				await note.item('Personal').dblclick()
				await note.item('Trips & Events').dblclick()
				await note.open('Weekend Cabin Trip Planning').click()
				await editor.activateEditMode().click()

				await mimiri().setSafeInsets(safeArea)
				await mimiri().screenshotMobile('front-page', screenshotName)
			}, device)
		})
	})

	phoneDevices.forEach(({ name, device, safeArea, screenshotName }) => {
		test.only(`${name} - Share`, async () => {
			await withMimiriContext(async () => {
				await mimiri().home()
				mimiri().config.username = 'Alice'
				mimiri().config.password = process.env.DEMO_ACCOUNT_PASSWORD!
				mimiri().config.cleanUp = false
				await login()
				await mimiri().resetTreeState()
				await mimiri().reload()
				await mimiri().setConnectDelay(100)
				await mimiri().appearShared(sharedNotes)
				await expect(settingNodes.controlPanel()).toBeVisible()
				await settingNodes.controlPanel().dblclick()
				await note.item('Dev Blog').click()
				await mimiri().waitForTimeout(500)
				await settingNodes.controlPanel().dblclick()
				await note.item('Work Projects').dblclick()
				await note.item('Mimiri Development').click()
				await mimiri().waitForTimeout(500)
				await mainToolbar.mobileMenu().click()
				await menu.share().click()
				await shareDialog.username().fill('Bob')
				await mimiri().setShareCode('4257')

				await mimiri().setSafeInsets(safeArea)
				await mimiri().screenshotMobile('share-dialog', screenshotName)
			}, device)
		})
	})

	phoneDevices.forEach(({ name, device, safeArea, screenshotName }) => {
		test(`${name} - History`, async () => {
			await withMimiriContext(async () => {
				await mimiri().home()
				mimiri().config.username = 'Alice'
				mimiri().config.password = process.env.DEMO_ACCOUNT_PASSWORD!
				mimiri().config.cleanUp = false
				await login()
				await mimiri().resetTreeState()
				await mimiri().reload()
				await mimiri().appearShared(sharedNotes)
				await expect(settingNodes.controlPanel()).toBeVisible()
				await settingNodes.controlPanel().dblclick()
				await note.item('Dev Blog').click()
				await mimiri().waitForTimeout(500)
				await settingNodes.controlPanel().dblclick()
				await note.item('Work Projects').dblclick()
				await note.item('Mimiri Development').dblclick()
				await note.item('Sprint Planning').dblclick()
				await note.open('Authentication System').click()
				await mimiri().setHistoryEntries(historyItems)
				await editor.activateEditMode().click()
				await editor.history().click()

				await mimiri().setSafeInsets(safeArea)
				await mimiri().screenshotMobile('history', screenshotName)
			}, device)
		})
	})

	phoneDevices.forEach(({ name, device, safeArea, screenshotName }) => {
		test(`${name} - Create Account`, async () => {
			await withMimiriContext(async () => {
				await mimiri().home()
				await expect(settingNodes.controlPanel()).toBeVisible()
				await mimiri().setSafeInsets(safeArea)

				await note.item('Dev Blog').click()
				await mimiri().waitForTimeout(500)
				await settingNodes.createAccount().locator('button').click()
				await mimiri().screenshotMobile('cloud-account', screenshotName)
				await settingView.localAccount().click()
				await mimiri().screenshotMobile('local-account', screenshotName)
			}, device)
		})
	})

	tabletDevices.forEach(({ name, device, safeArea, screenshotName }) => {
		test(`${name} - Front Page`, async () => {
			await withMimiriContext(async () => {
				await mimiri().home()
				mimiri().config.username = 'Alice'
				mimiri().config.password = process.env.DEMO_ACCOUNT_PASSWORD!
				mimiri().config.cleanUp = false
				await login()
				await expect(settingNodes.controlPanel()).toBeVisible()

				await mimiri().appearShared(sharedNotes)
				await settingNodes.controlPanel().dblclick()
				await settingNodes.settingGroup().dblclick()
				await note.item('Dev Blog').click()
				await mimiri().waitForTimeout(500)
				await note.item('Work Projects').dblclick()
				await note.item('Personal').dblclick()
				await note.item('Trips & Events').dblclick()
				await note.item('Weekend Cabin Trip Planning').click()

				await mimiri().setSafeInsets(safeArea)
				await mimiri().screenshotMobile('front-page', screenshotName)
			}, device)
		})
	})

	tabletDevices.forEach(({ name, device, safeArea, screenshotName }) => {
		test.only(`${name} - Share`, async () => {
			await withMimiriContext(async () => {
				await mimiri().home()
				mimiri().config.username = 'Alice'
				mimiri().config.password = process.env.DEMO_ACCOUNT_PASSWORD!
				mimiri().config.cleanUp = false
				await login()
				await mimiri().resetTreeState()
				await mimiri().reload()
				await mimiri().appearShared(sharedNotes)
				await expect(settingNodes.controlPanel()).toBeVisible()
				await settingNodes.controlPanel().dblclick()
				await note.item('Dev Blog').click()
				await mimiri().waitForTimeout(500)
				await settingNodes.controlPanel().dblclick()
				await note.item('Work Projects').dblclick()
				await note.item('Mimiri Development').click({ button: 'right' })
				await menu.share().click()
				await shareDialog.username().fill('Bob')
				await mimiri().setShareCode('4257')

				await mimiri().setSafeInsets(safeArea)
				await mimiri().screenshotMobile('share-dialog', screenshotName)
			}, device)
		})
	})

	tabletDevices.forEach(({ name, device, safeArea, screenshotName }) => {
		test(`${name} - History`, async () => {
			await withMimiriContext(async () => {
				await mimiri().home()
				mimiri().config.username = 'Alice'
				mimiri().config.password = process.env.DEMO_ACCOUNT_PASSWORD!
				mimiri().config.cleanUp = false
				await login()
				await mimiri().resetTreeState()
				await mimiri().reload()
				await mimiri().appearShared(sharedNotes)
				await expect(settingNodes.controlPanel()).toBeVisible()
				await settingNodes.controlPanel().dblclick()
				await note.item('Dev Blog').click()
				await mimiri().waitForTimeout(500)
				await settingNodes.controlPanel().dblclick()
				await note.item('Work Projects').dblclick()
				await note.item('Mimiri Development').dblclick()
				await note.item('Sprint Planning').dblclick()
				await note.item('Authentication System').click()
				await mimiri().setHistoryEntries(historyItems)
				await editor.toggleWordWrap().click()
				await editor.history().click()

				await mimiri().setSafeInsets(safeArea)
				await mimiri().screenshotMobile('history', screenshotName)
			}, device)
		})
	})

	tabletDevices.forEach(({ name, device, safeArea, screenshotName }) => {
		test(`${name} - Create Account`, async () => {
			await withMimiriContext(async () => {
				await mimiri().home()
				await expect(settingNodes.controlPanel()).toBeVisible()
				await mimiri().setSafeInsets(safeArea)

				await note.item('Dev Blog').click()
				await mimiri().waitForTimeout(500)
				await settingNodes.createAccount().click()
				await mimiri().screenshotMobile('cloud-account', screenshotName)
				await settingView.localAccount().click()
				await mimiri().screenshotMobile('local-account', screenshotName)
			}, device)
		})
	})

	test('Cutout Sharing', async () => {
		await withMimiriContext(async () => {
			console.log('Setting up Alice account...')
			await mimiri().home()

			mimiri().config.username = 'Alice'
			mimiri().config.password = process.env.DEMO_ACCOUNT_PASSWORD!
			mimiri().config.cleanUp = false
			await login()

			await expect(settingNodes.controlPanel()).toBeVisible()

			await note.item('Work Projects').click({ button: 'right' })
			await menu.share().hover()

			await mimiri().screenshot('cutout-sharing', { x: 0, y: 100, width: 400, height: 400 })
		})
	})
})
