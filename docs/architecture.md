# Architecture

Mimiri Notes client is a single Vue 3 + TypeScript SPA compiled once and shipped three ways:

```
                 mimiri-client (this repo)
                 Vue 3 + TypeScript + Vite
                            │
     ┌──────────────────────┼──────────────────────┐
     ▼                      ▼                      ▼
   Web                  Capacitor               Electron
 app.mimiri.io        ios/ + android/      mimiri-client-electron
                      (in this repo)          (separate repo)
```

All platform differences are funnelled through two abstractions — `mimiriPlatform` (capability/OS detection) and `ipcClient` (native host API) — so the rest of the code is platform-agnostic. The app is offline-first and end-to-end encrypted: IndexedDB is the source of truth, and the server (`mimiri-server`, separate repo) is a sync relay that never sees plaintext.

## Bootstrap and global state

There is no Pinia/Vuex and no vue-router.

### `src/global.ts` — the DI container

Exports, which components and services import directly:

- **Eagerly constructed singletons**: `noteManager` (a `MimiriStore`), `updateManager`, `ipcClient`, `browserHistory`, `blogManager`, `notificationManager` (in-app toasts), `passwordGenerator`, `fontManager`, `clipboardManager`, `mimiriEditor`, `debug`, `devTools`, `localization` and `$t`.
- **Template refs filled by `App.vue`** via `ref="..."`: `contextMenu`, `loginDialog`, `shareDialog`, `inconsistencyDialog`, `titleBar`, `noteTreeView`, and every other dialog. Code anywhere calls e.g. `loginDialog.value.show()`.
- **Plain reactive globals**: `appStatus`, `syncStatus`, `blockUserInput`, `clipboardNote`, `dragId`, `showSearchBox`, `loginRequiredToGoOnline`, subscription-flow state.
- **Env resolution**: `host`/`serverKey`/`serverKeyId` (with a `mimiriTestInfo`-driven dev-API toggle and `testMode`), `updateKeys` built from `VITE_UPDATE_*`.

Other singletons are exported by their own modules: `settingsManager`, `persistedState`, `mimiriPlatform`, `menuManager`, `localAuth`, `searchManager`, `watchDog`.

Many services import from `global.ts` and `global.ts` imports them — watch for import cycles when adding new module-level code that runs at import time.

### `src/App.vue` — the shell and the startup sequence

`App.vue` renders everything: title bar, toolbar, `NoteTreeView`, splitter, and then one of `NoteEditor` / `SystemPage` / `PropertiesPage` chosen by the selected note's `type` and `noteManager.state.viewMode`. (`src/views/` is unused scaffolding.)

`onMounted` is the real startup sequence:

1. `mimiriPlatform.init()`
2. `settingsManager.load()`
3. `localization.setLocale(settingsManager.language)`
4. `debug.init()`
5. `updateManager.checkUpdateInitial()` — may hot-swap to a newer bundle and restart (sets `appStatus = 'update'`)
6. `noteManager.session.initialize()`

`appStatus` moves `initializing → loading → ready | update | error` and is exposed through a hidden input for e2e tests.

`App.vue` also owns the global `keydown` handler (delegating to methods `NoteTreeView.vue` exposes via `defineExpose`), applies the theme (`data-theme`, `data-device-type`, editor font vars on `<html>`), and rebuilds native menus when settings change.

### Dialogs

Every `src/components/dialogs/*.vue` follows one pattern: a native `<dialog ref="dialog">`, an `isOpen` ref, a `show(...)` that calls `showModal()`, and `defineExpose({ show })`. All dialogs are mounted once in `App.vue` with `ref="xxxDialog"`; the refs are declared as module-level `ref(null)` in `global.ts`. `elements/DialogTitle.vue` provides the header; buttons use the global `button.primary` / `button.secondary` classes.

### Menus

`src/services/menu-manager.ts` is the single source for context menus and Electron native/tray menus. `enum MenuItems` lists every action; `toItems()` builds `ContextMenuItem[]` with localized titles, icons, shortcuts and enabled/visible logic; `menuManager.showMenu({x, y}, [MenuItems…])` renders through `ContextMenu.vue`. Activation goes back through `menuIdActivated(itemId)`, which is also the entry point for Electron native menu clicks.

## Platform abstraction

### `src/services/mimiri-platform.ts`

Detection order in the constructor:

1. `sessionStorage.emulateCapacitor` (DEV only) — fakes phone/tablet iOS/Android for testing
2. `Capacitor.isPluginAvailable('MimiriPlatform')` → Capacitor; `Capacitor.getPlatform()` gives ios/android
3. `window.mimiri` present → Electron; reads `platform` and packaging flags (`isFlatpak`, `isSnap`, `isAppImage`, `isFlatHub`, `isSnapStore`, …)
4. Otherwise web; OS and phone/tablet guessed from the user agent

Exposes `isWeb/isElectron/isCapacitor/isIosApp/isAndroidApp/isMacApp/…`, `isDesktop`, `isPhone/isTablet`, `isHostUpdateManaged` (App Store / Flathub / Snap Store — no self-update), `supportsBiometry`, and a `platform` string (e.g. `Electron-Windows`, `iOS-Phone`, `Web`) that feeds the `X-Mimiri-Version` request header.

### `src/services/ipc-client.ts`

`ipcClient` picks `capacitorClient` if a Capacitor plugin is available, else `window.mimiri` (Electron preload), else nothing (`isAvailable === false` on web). It wraps `IpcApi` (`types/ipc.interfaces.ts`) into sub-objects: `menu`, `settings`, `bundle`, `window`, `watchDog`, `session`, `fileSystem`, `os`. `capacitor-client.ts` implements only `settings` and the update plugin and supplies no-op implementations for the rest. Prefer gating features on `ipcClient.isAvailable` / `ipcClient.fileSystem.isAvailable` etc. over platform checks.

### Settings and persisted state

- `SettingsManager` (`settings-manager.ts`) holds a `reactive<MimerConfiguration>` with defaults and getter/setter pairs that auto-`save()`. Backend: `ipcClient.settings` when a native host exists (Electron file / Capacitor plugin), else `localStorage['mimer-settings']`. Covers theme/dark mode, editor font and default editor, update channel and `UpdateMode`, locale (`SUPPORTED_LOCALES`), `debugEnabled`, anonymous-account credentials.
- `PersistedState` (`persisted-state.ts`) stores per-user UI state (selected note path, expanded ids, scroll positions, mobile `noteOpen`) in `localStorage['mimiri-state-<userId>']`. It is deliberately disabled on production web (`!mimiriPlatform.isWeb`, always on in DEV) as a privacy choice.
- Persisted login: a gzipped+base64 blob under `mimiri-login-data` — Electron session storage via `ipcClient.session`, `localStorage` on mobile (restore gated by biometrics), `sessionStorage` on web.

## Storage, crypto and sync (`src/services/storage/`)

`MimiriStore` (`mimiri-store.ts`) is the facade. It owns the single `reactive<SharedState>` (`type.ts`: `isLoggedIn`, `isOnline`, `accountType`, `workOffline`, `userStats`, `busy`, `viewMode`, `selectedNoteId`, …) and wires the managers. Components use the grouped APIs: `noteManager.state`, `.ui`, `.tree`, `.operations`, `.session`, `.auth`, `.note`, `.feedback`, `.payment`.

| Class | File | Responsibility |
|---|---|---|
| `MimiriDb` / `MimiriTransaction` | `mimiri-db.ts` | IndexedDB via `idb`. Per-user DB under a random `mimiri-<guid>` name (a `name-mappings` DB maps users to it so the username is not leaked). Stores: `note-store`, `note-local-store`, `note-deleted-store`, `key-store`, `key-local-store`, `key-deleted-store`, `user-store`. |
| `SyncLock` | `sync-lock.ts` | Shared/exclusive async lock guarding all read/write/sync sections. |
| `CryptographyManager` | `cryptography-manager.ts` | Holds `rootCrypt`, `localCrypt` and the loaded `KeySet[]`; creates keys, re-encrypts items between local and remote form. |
| `AuthenticationManager` | `authentication-manager.ts` | Login/create/promote/change-password/delete, request signing, persisted login, online/offline transitions, `userData`. |
| `MimiriClient` / `HttpClientBase` | `mimiri-client.ts`, `http-client-base.ts` | All REST calls and SignalR URL minting; `X-Mimiri-Version` header; debug latency/error injection. |
| `NotificationManager` | `storage/notification-manager.ts` | SignalR hub connection and reconnect policy. |
| `SynchronizationService` | `synchronization-service.ts` | Pull/push/merge, consistency scan. |
| `ConflictResolver` | `conflict-resolver.ts` | 3-way merge (`node-diff3`) of `text` / `metadata` / `history` items. |
| `NoteService` | `note-service.ts` | Read/write notes against the DB, produce `NoteAction`s, apply `multiAction` transactionally, maintain size/count deltas. |
| `NoteOperationsManager` | `note-operations-manager.ts` | Create/save/delete/copy/move/share/accept-share/import/export — every op ends with `queueSync()`. |
| `NoteTreeManager` | `note-tree-manager.ts` | In-memory `MimerNote` tree, `root` ref, id→note registry, selection, restore of expand/selected state. |
| `SessionManager` | `session-manager.ts` | Login/logout/openLocal/recoverLogin orchestration; creates root, Recycle Bin, Control Panel and Getting Started notes. |
| `LocalStateManager`, `UIStateManager` | | Per-user local state (workOffline, size deltas, firstLogin); busy spinner and mobile note-open state. |
| `PaymentClient`, `NoteImporter`, `NoteExporter`, `MultiAction` | | Subscriptions/invoices; folder import/export through `ipcClient.fileSystem`; batched note actions. |

### Data model

A `Note` (`types/note.ts`) is `id` + `keyName` + a list of versioned **items** keyed by type:

- `metadata` — title and the child `notes[]` array. **The tree lives in metadata**; moving a note edits two parents' metadata.
- `text` — the note body (plain text, see [editor.md](editor.md))
- `history`, `config`, `created`

`MimerNote` (`types/mimer-note.ts`) wraps a `Note` with a reactive `NoteViewModel` (title/icon/children/expanded/shared/…) that the tree components bind to. `VirtualNote` and `createControlPanelTree` (`types/control-panel.ts`) synthesize the non-persisted System/Control Panel subtree — settings pages are "notes" with special `type`s that `App.vue` routes to `SystemPage`.

### Encryption

Primitives are in `symmetric-crypt.ts` (`SymmetricCrypt`) and `crypt-signature.ts` (`CryptSignature`), all WebCrypto:

- Symmetric: `AES;GCM;32` (default) and `AES;CBC;PKCS7;32` (dotnet-compatible, used inside RSA hybrid encryption). Payloads over 512 bytes are gzip-compressed with a `00 00 00 01` magic prefix before encryption. IV is prepended, output is base64.
- Asymmetric: `RSA;4096` (`RSASSA-PKCS1-v1_5`/SHA-256 signatures, `RSA-OAEP` hybrid encryption). Server key is `RSA;3072`.
- Password: PBKDF2-SHA512, `DEFAULT_ITERATIONS = 1_000_000` (`security-constants.ts`). `password-hasher.ts` answers a server challenge with HMAC-SHA512 — the derived hash never leaves the client.

Key hierarchy: `password → userCrypt (PBKDF2) → rootCrypt (random AES key wrapped by userCrypt) → per-subtree KeySets`. Each `KeySet` = symmetric key + RSA signing pair + `{shared}` metadata; notes reference their key by `keyName`.

Two-tier local encryption: rows in `note-store`/`key-store` (server-synced copies) are encrypted with rootCrypt/key-set keys; rows in `note-local-store`/`key-local-store` (unsynced edits) with `localCrypt`, a separate random key stored wrapped by rootCrypt in `user-store/local-data`. Push re-encrypts local→key-set; pull decrypts key-set. `InitializationData` in `user-store` holds salts/algorithms/wrapped root keys so login works fully offline.

### Talking to the server

1. **REST** (`MimiriClient`) to `VITE_MIMER_API_HOST`: `/user/*`, `/sync/changes-since`, `/sync/push-changes`, `/note/*`, `/key/create`, `/notification/create-url`, `/feedback/add-comment`. Every authenticated request carries `signatures[]` — a `TOKEN` entry plus an RSA signature over the JSON body with `signatures` stripped; key-scoped requests are additionally signed with the relevant key set. Account create/update bodies are RSA-encrypted to the server public key (`VITE_API_PUBLIC_KEY`).
2. **SignalR** (`storage/notification-manager.ts`): a short-lived URL is minted via `/notification/create-url`; the hub emits `notification(sender, type, payload)` with types `note-update`/`sync`, `bundle-update`, `blog-post`. `MimiriStore` maps these and lifecycle events (`connected`, `reconnected`, `resumed`) to `syncService.queueSync()`, `updateManager.check()`, `blogManager.refreshAll()`. Exponential backoff with jitter; gives up on repeated 401/403. **`state.isOnline` is driven purely by this connection.** Mobile suspend/resume is honored via `MimiriStore.suspend/resume`.
3. **Update host** (`VITE_MIMER_UPDATE_HOST`) — bundles and `getting-started.json`; see [release.md](release.md).

### Sync algorithm (`SynchronizationService`)

- `syncPull()` — `getChangesSince(lastNoteSync, lastKeySync)` (watermarks in `user-store/last-sync`), verifies a `sha256` integrity field and retries up to 3×, writes keys/notes to the remote stores, loops up to 100 pages, then fires `noteUpdatedCallback` per changed note.
- `syncPush()` — enforces size/count limits first (`syncStatus` becomes `total-size-limit-exceeded` / `count-limit-exceeded` / `note-size-limit-exceeded` / `server-rejection`), diffs each local note against its stored `base` and the current remote, runs `ConflictResolver` when the remote moved, re-encrypts local→key-set, and posts `NoteSyncAction[]` + `KeySyncAction[]` with a client-generated `syncId` (echoed back over SignalR and ignored via `isSyncIdIssued`).
- `sync()` = pull → push → pull, with exponential retry up to 5 min, coalescing repeated requests, and `waitForSync(timeoutMs)` for callers.
- `checkForConsistency()` / `scanForConsistency()` move orphan notes to the Recycle Bin, fix duplicated parents, and raise `inconsistencyDialog`.

### Sharing

`shareMimerNote` does proof of work (`proof-of-work.ts`, `DEFAULT_PROOF_BITS = 15`), creates or reuses a `{shared: true}` key set, rekeys the whole subtree to it (`changeNoteKey`), then posts a `NoteShareInfo` (symmetric key + the key set's RSA pair) RSA-encrypted to the recipient's public key. The recipient's `acceptShare` decrypts with its root signature key, calls `/key/create`, and links the shared note id into a parent's `metadata.notes`. `ensureShareAllowable` forbids sharing the root, nesting shares, and subtrees with mixed keys.

### Account types

`AccountType.None` (anonymous local-only, DB named `local`, rootCrypt merely obfuscated), `Local` (username+password, no server), `Cloud`. `promoteToLocalAccount` / `promoteToCloudAccount` rewrite `InitializationData` and rename the DB.

## Note tree UI

- `NoteTreeView.vue` renders `TreeNode.vue` recursively from `noteManager.tree.root().viewModel.children` and exposes keyboard operations (`moveSelectionUp/Down/Left/Right`, `duplicate/copy/cut/pasteInto/delete/recycle/renameActiveNote`) for `App.vue`'s global key handler.
- `TreeNode.vue` handles select (`openNote`), expand/collapse, inline rename, HTML5 drag & drop with a three-zone drop target (`-1 | 0 | 1` → before / into / after), and the per-node context menu. `NewTreeNode.vue` is the inline create row.
- Selection state lives in the store (`noteManager.state.selectedNoteId`, `noteManager.tree.selectedNote()`), and `browser-history.ts` mirrors it into the URL hash.

## Localization

`src/services/localization.ts` is a hand-rolled provider (no vue-i18n): `register(locale, data)`, `setLocale`, `t(key, params)` with dot-path lookup, fallback to `en`, `{name}` interpolation, and reactive state so `setLocale` re-renders. `main.ts` registers `src/lang/{en,zh,zh-hant,da,de}.json` before mounting and installs `$t` as a Vue global property (`env.d.ts` types it); `.ts` code imports `$t` from `global.ts`.

**Adding a string**: add the key to `src/lang/en.json` (nested namespaces) and a translator note at the same path in `src/lang/context.json` (where it appears, tone, `{vars}`, caveats).

**Reviewing translations** with `node scripts/generate-translation-review.js <lang>`:

- no flag → writes `src/lang/<lang>.review.json`: `{ en, <lang>, <lang>_en: "" }` per key for an AI/translator to fill with a back-translation, plus `{status: "missing"}` / `{status: "stale"}` entries. Keys whose `en` + `<lang>` are unchanged in `<lang>_accepted.json` are skipped.
- `--diff` → writes `<lang>.review-diff.json` with only diverging entries (empty or identical back-translation counts as equivalent).
- `--harvest [accept,flag,modify]` → moves diff entries with a matching `_recommendation` into `<lang>_accepted.json`.

`<lang>_accepted.json` is the durable record; `*.review*.json` are working files. Drift detection matches on `en` + `<lang>` only, so changing either string re-surfaces the key.

## Theming and icons

Tailwind v4 with no `tailwind.config.js` — configuration is CSS. `src/assets/main.css` imports tailwind, `colors-light.css` (the `@theme` block: fonts, text-size scale, every `--color-*` token for UI and editor), `colors-dark.css` (same names under `html[data-theme='dark']`), `monaco-editor.css`, `prosemirror-editor.css`, and declares `@custom-variant mobile/desktop/compact`. Tokens become utilities automatically (`bg-back`, `text-menu-text`, `bg-item-selected`, `text-size-menu`). To add a color: add `--color-foo` to both files, use `bg-foo`/`text-foo`.

`App.vue` sets `data-theme`, `data-device-type` (`mobile:`/`desktop:` variants) and `data-env-support` (safe-area insets) on `<html>`, and pushes the user's editor font into `--font-editor` / `--text-size-editor`. Editor syntax themes are separate — see [editor.md](editor.md).

Icons: `src/icons.json` maps `icon-name` → `{url (svgrepo), license, attribution, collection, remix?}`. `npm run icons-import` (`scripts/icons.js`) downloads each SVG through a persistent Playwright profile (svgrepo needs a one-time human verification), strips editor cruft, rewrites sizes to `100%` and every `#rrggbb` to `currentColor`, writes `src/icons/<name>.vue`, and regenerates `src/icons/attributions.ts`. Hand-edited SVGs go in `src/icons.remix/` and are referenced via the `remix` field. Because of `currentColor` + `100%`, icons are sized and colored purely by Tailwind classes on the wrapper. `ToolbarIcon.vue` maps icon-name strings (also used by menu items) to components.
