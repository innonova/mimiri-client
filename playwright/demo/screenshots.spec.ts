import { expect, test } from '@playwright/test'
import { mimiri, withMimiriContext } from '../framework/mimiri-context'
import { settingNodes } from '../selectors'

test.describe('Screenshots', () => {
	test('Desktop', async () => {
		await withMimiriContext(async () => {
			console.log('Setting up Alice account...')
			await mimiri().home()
			await expect(settingNodes.controlPanel()).toBeVisible()
			await mimiri().screenshot('alice-setup')
		})
	})
})
