import { expect, test } from '@playwright/test'
import { mimiri, withMimiriContext } from '../framework/mimiri-context'
import { menu, note, settingNodes } from '../selectors'
import { login } from '../core/actions'

test.describe('Cutouts', () => {
	test('Sharing', async () => {
		await withMimiriContext(async () => {
			console.log('Setting up Alice account...')
			await mimiri().home()

			mimiri().config.username = 'Alice'
			mimiri().config.password = process.env.DEMO_ACCOUNT_PASSWORD!
			await login()

			await expect(settingNodes.controlPanel()).toBeVisible()

			await note.item('Work Projects').click({ button: 'right' })
			await menu.share().hover()

			await mimiri().screenshot('cutout-sharing', { x: 0, y: 100, width: 400, height: 400 })
		})
	})
})
