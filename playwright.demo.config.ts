import { type PlaywrightTestConfig, devices } from '@playwright/test'

const port = 5173
export const testServerUrl = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${port}`
const isCi = !!process.env.CI

const config: PlaywrightTestConfig = {
	use: {
		headless: true,
		ignoreHTTPSErrors: true,
		trace: 'on-first-retry',
		// trace: 'on',
		video: 'off',
		baseURL: testServerUrl,
		screenshot: 'on',
		permissions: ['clipboard-read', 'clipboard-write'],
		actionTimeout: 10_000,
		navigationTimeout: 30_000,
	},
	// reporter: [['list'], ['html', { open: 'never' }]],
	testMatch: 'playwright/demo/*.spec.ts',
	retries: process.argv.includes('--headed') ? 0 : 2,
	workers: 5,
	fullyParallel: true,
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'], channel: 'chromium', viewport: { width: 1280, height: 720 } },
		},
	],
	maxFailures: isCi ? 1 : undefined,
	timeout: 120_000,
	expect: {
		timeout: 10_000,
	},
}

export default config
