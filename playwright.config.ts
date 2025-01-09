import { type PlaywrightTestConfig, devices } from '@playwright/test'

const port = 5173
export const testServerUrl = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${port}`
const useWebServer = process.env.NO_WEB_SERVER === undefined ? true : undefined
const isCi = !!process.env.CI

const config: PlaywrightTestConfig = {
  use: {
    headless: false,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    baseURL: testServerUrl,
    screenshot: 'only-on-failure',
  },
  testMatch: 'playwright/*.spec.ts',
  retries: 0,
  fullyParallel: true,
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: 'chromium' },
    },
  ],
  webServer: useWebServer && {
    command: `npm run dev -- --port ${port}`,
    url: testServerUrl,
    timeout: 30_000,
  },
  // fail fast on ci to keep ci-minutes low
  maxFailures: isCi ? 1 : undefined,
  expect: {
    timeout: 30_000,
  },
  timeout: 30_000,
}

export default config
