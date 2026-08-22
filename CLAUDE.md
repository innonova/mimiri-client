# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Mimiri Notes client (https://mimiri.io): an end-to-end-encrypted, offline-first, tree-structured note app. This repo is the single Vue 3 + TypeScript SPA shipped as web (app.mimiri.io), Capacitor iOS/Android (`ios/`, `android/` live here), and Electron desktop (wrapped by the separate `mimiri-client-electron` repo). The server is a sync relay that never sees plaintext.

## Docs — read the relevant one before non-trivial work

- [docs/architecture.md](docs/architecture.md) — global state/DI, startup sequence, platform abstraction, storage + crypto + sync, sharing, tree UI, localization, theming, icons
- [docs/editor.md](docs/editor.md) — Monaco/ProseMirror dual editor and the plain-text round-trip invariant
- [docs/testing.md](docs/testing.md) — jest + Playwright, the live-backend prerequisites, the `withMimiriContext` framework
- [docs/release.md](docs/release.md) — version fields, signed bundles/channels, runtime updater, store release workflows
- [docs/update-packages.md](docs/update-packages.md) — dependency update policy (7-day cooldown)

## Commands

```bash
npm run dev            # vite dev server on :5173
npm run build          # type-check + vite build
npm run type-check     # vue-tsc --build --force
npm run lint           # eslint src
npm run prettier       # prettier --check

npm test                                          # jest unit tests (pure, no server)
npx jest src/services/password-generator.test.ts  # single file
npx jest -t "pattern"

npm run e2e                                       # playwright — needs a running dev server, see below
npx playwright test playwright/sharing.spec.ts
npx playwright test playwright/editor.spec.ts -g "name"
npx playwright test --headed

npm run sync / sync-dev   # build + cap sync;  npm run ios / android opens the IDE
```

**Playwright**: does not start the app and has no mock backend. Run `npx vite --host --mode dev` first (dev build required — test hooks only exist in DEV; `.env.dev` points at the live dev API), and don't edit `src/` mid-run (restart the server before trusting results if you did). Details in [docs/testing.md](docs/testing.md). e2e is not run in CI.

## Things that are easy to get wrong

- **No Pinia, no router.** `src/global.ts` is the DI container: singletons, reactive globals, and the dialog/component refs that `App.vue` fills. Open dialogs with `xxxDialog.value.show()`. `src/views/` is unused.
- **Menus** (context and Electron native) are defined once in `src/services/menu-manager.ts` (`enum MenuItems` → `toItems()` → `menuIdActivated`).
- **Platform checks**: prefer `ipcClient.isAvailable` / `ipcClient.<sub>.isAvailable` over `mimiriPlatform.isX` for feature gating.
- **The tree lives in note metadata** (`metadata.notes[]`); every mutating op in `note-operations-manager.ts` must end with `queueSync()`. `state.isOnline` is derived solely from the SignalR connection.
- **Notes are plain text.** Changing the text syntax (headings, lists/checkboxes, password marks, code fences, conflict markers) requires updating the ProseMirror deserializer *and* serializer *and* the matching Monaco plugin.
- **Localization**: a new string goes in `src/lang/en.json` **and** a translator note at the same path in `src/lang/context.json`. Use `$t('ns.key')`. Don't hand-edit other locales' `_accepted.json`; that is the review script's output.
- **Theming**: Tailwind v4 configured in CSS. A new color token goes in both `src/assets/colors-light.css` and `colors-dark.css`, then use `bg-foo`/`text-foo`.
- **Icons**: edit `src/icons.json` and run `npm run icons-import`; don't hand-write `src/icons/*.vue`.
- **e2e selectors** are `data-testid` via `playwright/selectors.ts`; keep existing ids stable.
- **`mobile.yml` fails if `cap sync` produces a diff** — commit generated files under `android/`/`ios/`.
- **Releases**: `package.json.version` is the bundle version; `minElectronVersion*`/`minIos`/`minAndroid` gate hosts; `base-version.json` + `bundle-info.json` pin the bundle baked into store builds. Don't bump these casually — see [docs/release.md](docs/release.md).
- `.env*` files must never be edited or committed (`.cursorban`); `.env.example` documents the variables.

## Style

Prettier: tabs, no semicolons, single quotes, trailing commas, width 120. ESLint: `curly` is an error, type assertions must use `as`, floating promises warn (`void` allowed), unused vars prefixed `_` are fine. `strictNullChecks` is off.
