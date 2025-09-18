import { devices, expect, test } from '@playwright/test'
import { mimiri, withMimiriContext } from '../framework/mimiri-context'
import { settingNodes } from '../selectors'

test.describe('Screenshots', () => {
	test('Mobile', async () => {
		await withMimiriContext(
			async () => {
				console.log('Setting up Alice account...')
				await mimiri().home()
				await mimiri().page.evaluate(() =>
					(globalThis as any).document.documentElement.style.setProperty('--safe-area-top', '62px'),
				)
				await mimiri().page.evaluate(() =>
					(globalThis as any).document.documentElement.style.setProperty('--safe-area-bottom', '34px'),
				)
				await expect(settingNodes.controlPanel()).toBeVisible()
				await mimiri().screenshotMobile('alice-setup')
			},
			{ viewport: { width: 402, height: 874 }, userAgent: devices['iPhone 14 Pro'].userAgent },
		)
	})
})
