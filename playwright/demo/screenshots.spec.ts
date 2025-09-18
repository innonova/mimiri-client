import { expect, test } from '@playwright/test'
import { mimiri, withMimiriContext } from '../framework/mimiri-context'
import { settingNodes } from '../selectors'

test.describe('Screenshots', () => {
	test('Desktop', async () => {
		await withMimiriContext(async () => {
			console.log('Setting up Alice account...')
			await mimiri().home()
			await expect(settingNodes.controlPanel()).toBeVisible()
			await mimiri().page.screenshot({ path: 'screenshots/screens/light/alice-setup.png' })
			await mimiri().page.evaluate(() => (globalThis as any).mimiriApi.setDarkMode(true))
			await mimiri().page.screenshot({ path: 'screenshots/screens/dark/alice-setup.png' })
		})
	})
})
