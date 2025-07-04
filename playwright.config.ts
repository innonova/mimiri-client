import { type PlaywrightTestConfig, devices } from '@playwright/test'

const port = 5173
export const testServerUrl = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${port}`
const useWebServer = process.env.NO_WEB_SERVER === undefined ? true : undefined
const isCi = !!process.env.CI

const config: PlaywrightTestConfig = {
	use: {
		headless: true,
		viewport: { width: 1280, height: 720 },
		ignoreHTTPSErrors: true,
		trace: 'on-first-retry',
		video: 'on-first-retry',
		baseURL: testServerUrl,
		screenshot: 'only-on-failure',
		permissions: ['clipboard-read', 'clipboard-write'],
	},
	testMatch: 'playwright/*.spec.ts',
	retries: 0,
	workers: 5,
	fullyParallel: true,
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'], channel: 'chromium' },
		},
	],
	maxFailures: isCi ? 1 : undefined,
	timeout: 120_000,
	expect: {
		timeout: 10_000,
	},
}

export default config
