# Testing

Two suites with no overlap.

## Jest unit tests

`src/**/*.test.ts`, colocated with the code (`password-generator`, `localization`, `storage/conflict-resolver`, `storage/note-importer`, `storage/note-exporter`). Pure, no server or env needed. Config: `jest.config.js` (ts-jest, node environment, `tsconfig.jest.json`, ignores `playwright/`).

```bash
npm test
npx jest src/services/password-generator.test.ts
npx jest -t "pattern"
```

This is the only test suite CI runs (`.github/workflows/ci.yml`: `npm run lint`, `npm run type-check`, `npm test`).

## Playwright e2e

`playwright/*.spec.ts` — ~27 files, ~220 tests. Config: `playwright.config.ts` (chromium only, 5 workers, `fullyParallel`, retries 2 — 0 when `--headed`, timeout 120 s, `maxFailures: 1` under `CI`). Only top-level `playwright/*.spec.ts` are matched; subfolders are helpers. `playwright/deprecated/` is inert.

```bash
npm run e2e                                         # = playwright test --retries=1
npx playwright test playwright/sharing.spec.ts      # one spec
npx playwright test playwright/editor.spec.ts -g "test name"
npx playwright test --headed
npm run e2e-ss-update                               # update snapshots
```

### Prerequisites — read before running

1. **Playwright does not start the app.** There is no `webServer` block; `baseURL` is `PLAYWRIGHT_BASE_URL || http://localhost:5173`. Start the dev server yourself.
2. **It must be a Vite dev build.** The test hooks (`globalThis.mimiriApi` in `storage/mimiri-api.ts`, `globalThis.devTools` in `dev-tools.ts`, `window.mimiriTestInfo`) are only registered when `import.meta.env.DEV`. A production `vite preview` will fail every test.
3. **There is no mock backend.** Tests run against the live dev infrastructure: `dev-api.mimiri.io`, `dev-mimiri-api.mimiri.io`, `dev-payment.mimiri.io` (orchestration / test-control API, hardcoded in `playwright/framework/orchestration-client.ts`), `mock-payrexx.mimiri.io`, and the estate's mail-server at `mail.int.innonova.ch` (reachable from the estate's private networks; the dev payments service holds a sandbox key there, so its mail is captured, never sent). Only the payment provider is mocked.
4. **Env**: the documented recipe (see `e2e-functional-coverage-plan.md`) is `npx vite --host --mode dev` so a local, gitignored `.env.dev` overrides `.env` and points `VITE_MIMER_API_HOST` at dev-api. Playwright loads `.env` via `dotenv` in `playwright.config.ts` (so the workers inherit it) and in `playwright/framework/mimiri-state.ts`; email-dependent tests need `MAIL_SERVER_API_KEY`, a sandbox key of the application the dev payments service uses (ask the person who runs the estate), and `NODE_EXTRA_CA_CERTS` pointing at the estate's CA when running outside it (see `.env.example`).
5. **Don't edit `src/` while a run is in progress.** Vite HMR replacing modules mid-run can leave the app's module-level singletons half-reloaded and produce deterministic-looking failures that vanish on a fresh server. If you changed code during a run, restart the dev server before trusting the results.

Symptoms of a wrong backend: account creation hangs, blog call count 0, every cloud test times out.

### Framework

No Playwright fixtures or global setup. Instead an `AsyncLocalStorage`-based context in `playwright/framework/mimiri-context.ts`:

```ts
test('…', async () => {
  await withMimiriContext(async () => {
    await createCloudAccount()
    // mimiri() is the active MimiriState: page, account, helpers
    const bob = await mimiriCreate(true)   // second browser + user for sharing/sync tests
    // mimiriClone() opens a second window for the same account (multi-device sync)
  })
})
```

`MimiriState` (`framework/mimiri-state.ts`) launches chromium, generates a unique `auto_test_<id>` account and `max+<id>@testmail.mimiri.io` address, forces the mock payment provider, and on `terminate()` waits for the mail queue then calls orchestration `cleanUp(username)` and deletes the address's captured mail on the mail-server (`framework/mail-server-client.ts`, which reads `/v1/sandbox/messages` for the state's address and parses the links out of the HTML). Tests are self-cleaning; set `config.cleanUp = false` only when debugging.

- `framework/orchestration-client.ts` — backend test control: `clean-up`, `set-user-type`, `reset-database-soft`, `trigger-renewals`, `next-renewal-action`, `fail-next-charge`, real/mock Payrexx toggle, `waitForMailQueue`.
- `framework/fixtures.ts` — custom `expect` matchers (`toBeBetween`, `toBeBeforeNow`, `toBeInHours/Days/…`).
- `playwright/selectors.ts` — page objects; **every locator goes through `getByTestId`**. Add a `data-testid` to new UI elements that tests need and register it here.
- Action/check helpers: `playwright/core/{actions,checks}.ts` (`createLocalAccount`, `createCloudAccount`, `login`, `logout`, `setPin`, `saveNote`, `waitForAppIdle`), `playwright/notes/` (tree actions + `data*.ts` fixtures), `playwright/editor/`, `playwright/subscription/`, `playwright/deletion/`.

Roughly half the specs use `test.describe.configure({ mode: 'serial' })`.

### Demo / screenshots

`playwright/demo/` runs under `playwright.demo.config.ts` (`screenshot: 'on'`) and is **not** a test suite. `npm run demo` then `npm run process-screenshots` (or `npm run create-screenshots` for both) drives fixed `Alice`/`Bob` accounts (`DEMO_ACCOUNT_PASSWORD`, `cleanUp = false`), captures light+dark PNGs at phone/tablet viewports into `$SCREENSHOT_WORK_PATH`, and `scripts/process-screenshots.js` composites them onto device frames into `$SCREENSHOT_PUBLIC_PATH` with a gallery. The setup tests in `demo.setup.spec.ts` are `test.skip` (one-time provisioning).

## Coverage plan

`e2e-functional-coverage-plan.md` tracks which user-facing functionality has e2e coverage and what remains.
