import { devices, expect, test } from '@playwright/test'
import { mimiri, withMimiriContext } from '../framework/mimiri-context'
import { settingNodes } from '../selectors'

test.describe('Screenshots', () => {
	test.only('Mobile', async () => {
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
				await mimiri().page.screenshot({ path: `${process.env.SCREENSHOT_PATH}/screens/light-mobile/alice-setup.png` })
				await mimiri().page.evaluate(() => (globalThis as any).mimiriApi.setDarkMode(true))
				await mimiri().page.screenshot({ path: `${process.env.SCREENSHOT_PATH}/screens/dark-mobile/alice-setup.png` })
			},
			{ viewport: { width: 402, height: 874 }, userAgent: devices['iPhone 14 Pro'].userAgent },
		)
	})
})
