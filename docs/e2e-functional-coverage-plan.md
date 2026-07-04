# Mimiri Notes — Functional Coverage Plan for E2E Testing

This document inventories all user-facing functionality of the Mimiri client, as input for building an
extensive e2e test suite that can run across devices and platforms. It is organized by functional area;
each area lists the behaviors a user can exercise, the platform variance that affects them, and notes on
existing Playwright coverage (see [Coverage Map](#16-existing-coverage-map--gaps) at the end).

Sources: `src/services/menu-manager.ts`, `src/services/settings-manager.ts`, `src/services/types/control-panel.ts`,
`src/services/editor/*`, `src/services/storage/*`, `src/components/**`, and the existing `playwright/*.spec.ts` suites.

**Coverage legend** (based on analysis of the actual test bodies in `playwright/`, not just test names):

- ✅ **Covered** — behavior is explicitly exercised and asserted by an existing suite
- 🟡 **Partial** — touched incidentally (e.g. used as a helper step), or only some variants asserted
- ❌ **Not covered** — no existing e2e coverage
- ⏸ **Written but disabled** — tests exist but are currently `test.describe.skip`/`test.skip`ed, so they
  do **not** run and provide no protection until re-enabled

All existing coverage runs as **desktop-web Chromium only**; even ✅ items are unverified on mobile
viewports, Capacitor (iOS/Android), and Electron.

> ℹ️ **Disabled-suite status (updated 2026-07-03):** `subscription.spec.ts` was wholesale-skipped from
> 2026-02-01 (`084964a`) until re-enabled and repaired — all 33 runnable tests pass again. The failures were
> pure test drift, not product bugs: stale tier-quota constants (server plans were rebalanced ×10), and the
> Sept-2025 UI rework (free accounts skip the plan home view, Slider period/currency toggles, redesigned
> checkout, email-verification timing). Still skipped: `post-plan.spec.ts` (obsolete — see §2),
> the 3 real-Payrexx tests + 1 dev-setup test (intentional), and 2 conflict tests (`node move`/`node delete`)
> which guard a deliberately disabled product behavior with a real divergence consequence — see §5.5.

**Running the suite locally:** the tests expect the app to be served against the remote dev infrastructure
(`dev-api.mimiri.io`, `dev-mimiri-api.mimiri.io`, `dev-payment.mimiri.io`). Start the dev server with
`npx vite --host --mode dev` so `.env.dev` overrides apply — with a plain `npm run dev`, the local `.env`
may point at `https://localhost:62024` and every cloud-dependent test fails (account creation hangs, blog
call count is 0). Also restart the dev server after editing files under `src/` before judging test results:
stale vite HMR state mid-run can produce deterministic-looking failures that vanish on a fresh server.

---

## 1. Platforms, Form Factors & Test Dimensions

The same codebase runs everywhere; behavior branches on `mimiriPlatform` and `ipcClient.isAvailable`.

| Dimension | Values |
| --- | --- |
| Host | Web (browser), Electron (Windows / macOS / Linux), Capacitor (iOS / Android) |
| Linux packaging | Flatpak, Snap, AppImage, tar.gz (affects update handling) |
| Form factor | Desktop, Phone, Tablet (and "phone-size" responsive breakpoint on web) |
| Account type | None (account-less), Local, Cloud (+ anonymous cloud, i.e. auto-generated credentials) |
| Network | Online, offline (no network), work-offline (user choice) |
| Language | en, zh, da, de |
| Theme | System, Light, Dark |
| Editor | WYSIWYG (ProseMirror, default on mobile), Code/Advanced (Monaco, desktop; opt-in on mobile) |

Key platform gates observed in code:

- Import/export menu items: **Electron only** (`ipcClient.isAvailable`).
- PIN code settings: **Electron** (and localhost dev) with an account.
- Subscription/plan pages: **Desktop + Cloud account** only.
- Update page: hidden on web (except localhost dev); update behavior differs per Linux packaging.
- Tray menu, taskbar, launch-on-login, quit-on-close: Electron; some Windows-only, some Linux-only (tray icon color).
- Mobile toolbar (hamburger menu, account icon, notifications icon): phone only; back button in editor: non-desktop.
- Monaco on mobile requires the `allowMonacoOnMobile` setting.
- Mac app has its own application menu (Apple menu) and clipboard event handling.

---

## 2. Onboarding & First Run

- ❌ New install detection (`isNewInstall`), start counter.
- ❌ Getting-started notes added for new users; "Add getting started" from Help menu (dev mode).
- ✅ Default state without any account: account-less mode, notes stored locally, no login required
  (`account-less.spec.ts` — including an audit that **zero** API calls are made account-less).
- ⏸ Post-account-creation plan choice screen: **obsolete** — `post-plan.spec.ts` targets the
  `InitialPlanChooser` flow that was unwired from the app in the Sept-2025 subscription rework (`a1407f9`);
  the component still exists in `src/components/subscription/` but nothing renders it. The tests fail
  when un-skipped (chooser never appears). Decide: delete the spec + component, or re-wire the flow.
- ❌ First-run editor default: WYSIWYG on mobile, code editor for pre-existing installs on desktop.

## 3. Accounts & Identity

### 3.1 Account types and transitions

- ✅ **None (account-less)**: fully offline, no share options anywhere (context/File/Edit menus), settings tree
  shows "Create account", no PIN node, no subscription group (`account-less.spec.ts`).
- ✅ **Local**: same capability checks as account-less, plus login/logout round trips (`local-account.spec.ts`).
- ✅ **Cloud**: online indicator, share options present, expected API calls, settings tree contents (`cloud-account.spec.ts`).
- ❌ **Anonymous cloud** (auto-generated credentials) and the "Create password" claim flow — no coverage at all.
- ✅ Transitions: none → local, none → cloud (incl. data carried over, verified after logout/login and on a
  cloned second device), local → cloud plain / with new username / with new password / with both
  (`account-less.spec.ts`, `account-mutations.spec.ts`).
- ✅ Downgrade: cloud account deleted → falls back to local; delete local → back to none; two-step
  upgrade-then-downgrade chain (`account-mutations.spec.ts`).

### 3.2 Account operations

- ✅ Create account (local + cloud tabs, username availability indicator, password + repeat).
- ❌ Password strength meter (zxcvbn) — never asserted.
- ✅ Reserved usernames `local` and `mimiri*` show invalid; login accepts `@mimiri.io` suffix (`account-mutations.spec.ts`).
- ✅ Login / logout; failed login shows error (`loginFail` helper used after account deletion).
- 🟡 Logout on web with cloud account → delete-local-data warning dialog: the helper clicks through it when it
  appears, but the dialog's semantics (data actually removed, cancel path) are never asserted.
- ✅ Change username (local + cloud, incl. password-confirm dialog, persistence across logout/login).
- ✅ Change password (local + cloud); ✅ failure with wrong current password (error shown, old password still works).
- ✅ Delete account: local, and cloud with "delete all data" (incl. server-side cleanup assertions via
  `deletion/checks.ts` — associated customers/subscriptions/payment methods removed, invoices retained for bookkeeping).
- ✅ Password out-of-sync between devices: reload into new password, login into new password, cancel-then-go-online
  (both reload and login variants), direct login with new password (`password-desync.spec.ts`, 5 scenarios).
- ❌ Convert-account flow (`ConvertAccount.vue`).

### 3.3 PIN code & lock screen

- ✅ Set PIN (with password confirmation dialog), lock on hide + timeout, unlock via lock screen (`pin.spec.ts`).
- ✅ Incorrect PIN with attempts counter; ✅ multiple accounts each with own PIN; ✅ PIN node hidden without account.
- ✅ Change existing PIN; clear PIN disables the lock screen (`pin.spec.ts`, 2026-07-04).

## 4. Note Tree

### 4.1 Structure & navigation

- 🟡 Expand/collapse: exercised constantly as a navigation step in every suite, but chevron variants,
  vertical guides, and collapse-state persistence are never asserted.
- ✅ Selection and open-in-editor (implicit in all suites, asserted via editor content checks).
- ✅ Rename via F2 (`keyboard.spec.ts`); 🟡 rename via context menu (used as helper, not asserted as entry point).
- ✅ Rename conflicts between two devices (`conflict-test.spec.ts`).
- ✅ Copy path to clipboard (`note-tree.spec.ts`, 2026-07-04).
- ❌ Scroll position remembered per note.

### 4.2 Creation

- ✅ New root / child / sibling note via toolbar create menu, incl. text entry, save, persistence across
  reload (all account suites; `notes/actions.ts` helpers).
- ✅ Creation blocked on system notes (`system-notes.spec.ts`); ✅ creation blocked inside recycle bin
  (menu items hidden — `recycle-bin.spec.ts`).
- ❌ Save-empty-note handling (`SaveEmptyNodeDialog`; currently disabled in code).

### 4.3 Move / copy / clipboard

- ✅ Cut/copy/paste and delete/rename/duplicate via keyboard shortcuts (`keyboard.spec.ts`).
- ✅ Move and copy via menus: simple, complex multi-level trees, verified against expected tree snapshots,
  in all three account modes (`account-less/local-account/cloud-account.spec.ts` + `notes/actions.ts`).
- ✅ Move into own child is a no-op (all three account suites).
- ✅ Move/copy across shared boundaries re-keys notes (full matrix in `sharing.spec.ts` — see §7).
- 🟡 Drag & drop in the tree: basic move (online, offline, local accounts) + system-note protection covered
  (`drag.spec.ts`); drop-position variants (above/below/into), auto-expand on hover, and drop indicators
  still untested. Note: moving while offline is permitted **by design** (accepting the concurrent-move
  divergence risk — see §5.5); an offline-move block was tried 2026-07-03 and rolled back for UX reasons.
- ✅ Duplicate via context menu incl. content check (`note-tree.spec.ts`, 2026-07-04).

### 4.4 System notes

- ✅ Cannot cut, copy, duplicate, rename, delete system notes via context menu, Edit menu, **and** keyboard
  shortcuts; covers System, Settings, Updates, Dev Blog, Create Account, General, Fonts, Recycle Bin
  (`system-notes.spec.ts`).
- ✅ System note titles re-localize live when language changes (`settings.spec.ts`, 2026-07-04).

### 4.5 Recycle bin

- ✅ Recycle a note via menu / Del key; recycled note visible inside Recycle Bin (`system-notes.spec.ts`, `keyboard.spec.ts`).
- ✅ Empty recycle bin with confirm dialog; bin verified empty afterwards (`system-notes.spec.ts`; also used
  as a utility in quota/conflict suites).
- ✅ Recycle blocked when note contains shared descendants (`sharing.spec.ts`).
- ✅ Permanent delete of a single note from within the bin, incl. cancel path (`recycle-bin.spec.ts`, 2026-07-04).
- ✅ Restore by cut/paste out of the bin; content and children intact after the round trip (`recycle-bin.spec.ts`).
- ✅ In-bin context-menu restrictions: new note / rename / paste / share / recycle hidden, Delete shown
  instead of Recycle (`recycle-bin.spec.ts`).
- ✅ Empty recycle bin (dedicated test in `recycle-bin.spec.ts` in addition to the utility usages).
- ✅ Recycle-bin settings page: scan for inconsistencies (clean-tree path) and empty-from-settings incl.
  button enablement (`recycle-bin.spec.ts`, 2026-07-04); ❌ scan with actual inconsistencies (requires
  the §5.5 divergence scenario).

## 5. Editors

Two interchangeable editors over the same markdown-ish text model; mode persists per platform
(`defaultEditor` desktop / `defaultEditorMobile`).

> **Coverage note:** `editor.spec.ts` runs the shared behavior contract against **both** editors
> (parameterized over `code`/`wysiwyg`, helpers in `playwright/editor/`). Test contexts now start in the
> app default (ProseMirror on a new install); suites that need Monaco opt in via `ensureEditorMode('code')`,
> which drives the same toolbar toggle a user clicks. Raw-text assertions round-trip through the mode
> toggle, so every wysiwyg test also exercises the serializer.

### 5.1 Common behaviors (both editors)

- ✅ Type text, save (save button), content asserted, persists across reload — both editors (`editor.spec.ts`)
  plus incidental Monaco coverage in the account suites.
- 🟡 Save waits for sync completion incl. limit/error status codes (`waitForSyncToEnd` asserts the status-bar
  sync code) — but Ctrl+S and implicit save-on-note-switch are never explicitly tested.
- ✅ Save-error paths for note-size and total-size limits, incl. `LimitDialog` and upgrade path (`quota.spec.ts`).
- ❌ Lost-update save error surfaced to user.
- ✅ Save-button enablement tracks changed state (disabled → dirty → saved), both editors (`editor.spec.ts`).
- ✅ Undo / redo via toolbar buttons **and** Ctrl+Z / Ctrl+Y, both editors (`editor.spec.ts`);
  ❌ enablement states.
- ✅ Ctrl+S saves, dirty flag clears, content persists across reload, both editors (`editor.spec.ts`, 2026-07-04).
- ✅ Mark selection as password (`` p`…` `` raw form, masked rendering) / unmark, and copy-password-to-clipboard
  via the hover/inline copy button — both editors (`editor.spec.ts`).
- ✅ Formatting actions, both editors, DOM + serialized-text asserted: heading (incl. level cycling),
  inline code from single-line selection, code block from empty selection, checkbox list, unordered list,
  ordered list (`editor.spec.ts`).
- ✅ Toggle edit mode (WYSIWYG ↔ code) preserves unsaved changes and dirty state, both directions (`editor.spec.ts`);
  ❌ scroll position preservation.
- ✅ Find/replace behavior contract, **both editors** via the `findUI` adapter (`editor/find.ts`) mapping
  to the Mimiri find bar (wysiwyg) or Monaco's built-in widget (code): Ctrl+F open with focus + selection
  seeding, live match counter ('1 of 3' / 'No results'), Enter / buttons navigation, match-case /
  whole-word / regex toggles, Ctrl+H replace one + replace all with serializer round-trip, Escape close,
  F3 / Shift+F3 reopen-and-navigate without being swallowed by the global search shortcut (`editor.spec.ts`).
- ✅ Search-all highlight integration in wysiwyg: searching from the title bar and opening a result
  highlights the term in the note (`editor.spec.ts`); 🟡 Monaco side implemented but not e2e-tested.
- ❌ Read-only enforcement for system notes.

### 5.2 Code editor (Monaco, "advanced")

- ✅ Find/replace: covered by the shared contract suite (§5.1); the 'Find in Selection' toggle is
  deliberately hidden via `monaco-editor.css` and pinned by test (`editor.spec.ts`).
- ✅ Word wrap toolbar toggle on/off (`editor.spec.ts`).
- ❌ Syntax highlighting in code blocks; ❌ language autodetect/suggestions;
  ❌ selection expansion control (mobile), copy/select block, copy next line.

### 5.3 WYSIWYG editor (ProseMirror)

- ✅ Rendered-DOM checks for headings (h1/h2), bullet/ordered lists, code blocks, inline code,
  password mark views (`editor.spec.ts`).
- ✅ Checkbox list items: rendered with real checkboxes; clicking toggles state and updates the underlying
  text (`[ ]` ↔ `[x]`), verified through the serializer round-trip (`editor.spec.ts`).
- ✅ Find bar (Ctrl+F via `prosemirror-search`, added 2026-07-03, Monaco-parity UI): the shared
  find/replace contract runs against it in the parameterized suite (see §5.1). Wysiwyg-specific extras:
  highlight decorations (`ProseMirror-search-match` / active) appear and clear; find bar and highlights
  persist across note switches; replace is locked (find still works) in the read-only history view;
  global F3 / Ctrl+Shift+F / Escape fallbacks in `App.vue` defer to keys the focused editor already
  handled (`event.defaultPrevented` guard, fixed 2026-07-03) (`editor.spec.ts`).
- ✅ Word wrap button correctly hidden in this mode (`editor.spec.ts`).
- ✅ Markdown input rules while typing (`# ` heading, `- ` bullet, `1. ` ordered, `[ ] ` checkbox,
  `` `x` `` inline code) incl. serializer round-trip (`editor.spec.ts`, 2026-07-04).
- ❌ URL→link input rule, autocomplete popup (code-block language), keymap details
  (Tab/Shift-Tab list nesting, Mod-e), gap/drop cursor, mobile default behavior.

### 5.4 Note history

- ✅ Dedicated suite (`note-history.spec.ts`, 2026-07-04): version list newest-first with correct
  content per version; keyboard navigation (ArrowUp/Down) through versions; 'Read More Entries'
  paging of archived versions (active list caps at 10, older entries overflow into archives);
  delete old history (keeps the 10 newest); delete all history (content untouched, panel empty,
  verified across reload); cancel path keeps history.
- ✅ Read-only viewing additionally exercised by the find/replace read-only test (`editor.spec.ts`)
  and the sync edit-protection test (`sync-test.spec.ts`).
- ❌ Multi-user history entries (usernames per version in shared notes).

### 5.5 Conflict handling

- ✅ Concurrent-edit **auto-merge outcomes**: exhaustive scenario table (base/local/remote → expected) driven
  through two real clients with offline/online transitions; resulting text asserted
  (`conflict-test.spec.ts` + `notes/data.text-conflicts.ts`).
- ✅ Rename (metadata) conflicts between two devices.
- ⏸ Node **move** conflicts and node **delete** conflicts (`conflict-test.spec.ts`): these assert the
  automatic post-sync consistency check (inconsistency dialog → reload → converged trees), which was
  **deliberately disabled** 2025-09-17 (`5f0b723`) after causing more issues than it solved. ⚠️ Verified
  consequence (2026-07-03): concurrent moves of the same note on two devices leave the tree **permanently
  diverged across devices** (survives reloads). An offline-move block was tried and **rolled back** — the
  UX cost in offline mode outweighed the edge case. Current status: known accepted risk; a proper
  conflict-resolution fix is planned. The two tests stay skipped until that fix lands.
- ✅ Inconsistency dialog appears and reload recovers (asserted within conflict tests).
- ❌ **Interactive conflict banner**: keep local / keep server / keep both choices, prev/next conflict navigation.

## 6. Search

- ✅ Dedicated suite (`search.spec.ts`, 2026-07-04): term entry via title bar + Enter; tree filtered to
  matches and their ancestors; case-insensitive matching over text and titles; first-match auto-select;
  no-results message; close button restores the full tree; empty term clears the search;
  Ctrl+Shift+F focuses the global search from both editors.
- ✅ Term highlighting when opening a result (`editor.spec.ts`).
- ❌ Mobile search flow (search box overlay, toolbar toggle); offline/large-tree behavior;
  search progress indicator.

## 7. Sharing (Cloud accounts, online only)

- ✅ Share a note by recipient username → share code generated → second user accepts via code; single notes,
  folders with children, multiple items to different locations, mixed content into existing folders
  (`sharing.spec.ts`, 18 tests, all two-user via orchestration framework).
- ✅ Share-dialog validation errors: empty username, share-with-self, unknown recipient
  (`share-validation.spec.ts`, 2026-07-04).
- ✅ Leave share as recipient, as sender, leave-and-delete.
- ✅ Guards: cannot delete or recycle a regular note containing shared descendants; only the share root
  can be re-shared ("Can only share already shared notes from the root").
- ✅ Key management matrix: copy/move shared↔regular, root-share moves retain key + share status,
  moves/copies between two different shares change keys (8 dedicated tests).
- ✅ Live sync between share participants: creation, editing, deletion (`shared-sync.spec.ts`).
- ✅ Share participants shown in note properties ("shared with", empty state) (`sharing.spec.ts`).
- ✅ Share/receive options hidden account-less and on local accounts (`account-less/local-account.spec.ts`).
- ❌ Share offers list / notification-driven accept (only code-entry accept is covered).
- ❌ Accepting a share while initially offline, then going online.

## 8. Sync, Offline & Network

- ✅ Real-time sync between two devices: create, edit, hierarchy change, delete; editing protection
  against conflicts (`sync-test.spec.ts`).
- ✅ Offline-first basics: account-less and local accounts fully functional with zero API calls.
- ✅ Work-offline toggle and go-online via account menu (used both as helpers and asserted via account-button
  online/offline title in `network.spec.ts` and conflict tests).
- ✅ Login when no network; offline/online mechanics; sync recovery after connection loss mid-sync (`network.spec.ts`).
- 🟡 Status bar: machine-readable sync status code asserted broadly (idle / limit-exceeded / server-rejection /
  sync-error via `waitForSyncToEnd`); user-visible status messages never asserted.
- ❌ Sync-error dialog.
- ❌ Manual refresh (context-menu sync trigger) as a user-facing feature.

## 9. Quotas & Limits (Cloud)

All covered by `quota.spec.ts` (12 tests):

- ✅ Max note count, max total size, max single-note size enforcement.
- ✅ Size unchanged by moves; count semantics when copying subtrees.
- ✅ Limit dialog → upgrade path ("max size limit into upgrade").
- ✅ Share interactions: count on accepting a share, no count change when creating a share, count change when
  the other user adds notes, share pushing recipient over limit, recovering by leaving share, receiving while over limit.
- ✅ Note size verified via properties page (total size text).

## 10. Subscriptions & Billing (Desktop + Cloud only)

Covered by `subscription.spec.ts` (33 running tests + helpers in `playwright/subscription/`), re-enabled and
repaired 2026-07-03 after being wholesale-skipped since February:

- ✅ Create subscription (yearly + monthly) incl. billing-address entry from empty, payment flow, waiting-for-payment.
- ✅ Post-creation flow: free accounts land directly on plan selection (SubHome auto-redirects; the forced
  `InitialPlanChooser` no longer exists — see §2).
- ✅ Plan changes: upgrade tier, downgrade, change period monthly↔yearly, combined period+tier change.
- ✅ Payment methods: Mastercard and Twint flows; method handling during renewals (incl. "no methods" failure).
- ✅ Renewal matrix: success, retry once, retry twice, hard fail, declined payment — each for monthly and yearly;
  recovery after failed renewal from home and from invoices; no-reaction expiry; cancel + re-subscribe.
- ✅ Payment abort paths: failed payment, cancelled payment, navigating away mid-payment.
- ✅ Currencies: CHF, EUR, USD.
- ✅ Email verification on customer data via Mailpit round-trip (send → click link → verified badge;
  note: the backend flag propagates asynchronously, the helper polls by re-mounting the page).
- ✅ Account deletion cleans up billing objects server-side; invoices/transactions retained for legal bookkeeping
  (`deletion/checks.ts`).
- 🟡 Invoices: exercised as part of renewal-recovery flows; invoice list browsing, statuses, and PDF download
  not independently asserted.
- ❌ Verifying subscription pages are **absent** on non-desktop / local accounts (gating asserted only for the
  settings-tree node in account suites 🟡).

Known minor app bug found during repair: the "Verification email sent" notice in `CustomerData.vue` can never
render — its `v-if` requires `emailVerificationEmailSent` while `showEmailVerification` excludes it.

## 11. Import & Export (Electron only)

- ❌ Everything: export all notes, export subtree, sanitization/disambiguation rules, import of `.md`/`.txt`
  trees under timestamped root, collision handling, empty-folder skipping, round-trip fidelity, completion
  dialogs, menu gating (hidden on web/mobile).

## 12. Settings & Control Panel

- ✅ Settings **tree structure** per account type: which nodes exist/are hidden (update, blog, general,
  fonts & colors, PIN, create-account vs. account group, subscription group) — asserted in all three
  account suites.
- ✅ General page: language switching with live UI + system-note retitling; theme light/dark switch
  asserted on `html[data-theme]` (`settings.spec.ts`, 2026-07-04).
- ❌ Remaining general page behaviors: tray icon,
  launch on login, taskbar, quit on close, chevrons, vertical guides, disable dev blog (+ reload),
  allow Monaco on mobile, save-button dirty tracking.
- ❌ Fonts & colors page.
- ✅ PIN page: set, change and clear flows (see §3.3).
- ✅ Account pages: username/password/delete flows (see §3.2); ✅ connect-to-cloud page (`connectCloudView`).
- ✅ Plan/billing/payment-methods/invoices pages: exercised via subscription flows (see §10).
- ❌ Updates page: modes, channels, check-for-update, version display.
- 🟡 Dev blog: node visibility and exactly-one blog API call asserted; ❌ post list, read/unread, notification level.
- ❌ Debug page. ❌ About page contents beyond username/account-type fields (which are ✅, used as assertions everywhere).

## 13. Notifications & Title/Status Bars

- 🟡 Title bar: account button online/offline state asserted routinely; window controls, theming ❌.
- 🟡 Status bar: sync status code assertions only (see §8).
- ❌ Notification list, unread badge, mark-all-as-read, click-through (update available, share offers, blog posts).
- ❌ Tray behaviors (Electron): show/hide, tray menu items, tray icon theming.
- ❌ Screen-sharing protection toggle.

## 14. Tools & Misc

- ❌ Password generator (dialog and inline generation).
- ✅ Note properties page: total-size (quota), share participants (sharing), data/history/total sizes,
  created/modified dates, key name (`note-tree.spec.ts`), delete old/all history (`note-history.spec.ts`).
- ✅ Keyboard shortcuts: Ctrl+X/C/V, Ctrl+D, F2, Del (`keyboard.spec.ts`); system-note protection via
  shortcuts (`system-notes.spec.ts`); Ctrl+F/F3 (editor find), Ctrl+S, Ctrl+Z/Y, Ctrl+Shift+F
  (`editor.spec.ts`, `search.spec.ts`). ❌ Ctrl+N, Mac special-casing.
- 🟡 App menus: File/Edit menu **item visibility** asserted for share gating (`account-less.spec.ts`);
  full enablement matrix per state (online, selection, system, recycle bin) ❌; Mac application menu ❌;
  mobile hamburger menu ❌.
- ❌ Dark mode / theme switching, following OS theme.
- ❌ Localization rendering in zh/da/de.
- ❌ Watch dog / mobile lifecycle; window size persistence.

## 15. Error Handling & Edge-Case Dialogs

Per-dialog coverage status:

| Dialog | Status | Where |
| --- | --- | --- |
| Login | ✅ | all suites (incl. failure) |
| Password confirm | ✅ | username/password/PIN flows (incl. wrong password) |
| Delete node / recycle | ✅ | keyboard, system-notes, sharing |
| Empty recycle bin | ✅ | system-notes |
| Delete local data (web logout) | 🟡 | clicked through in logout helper, not asserted |
| Limit | ✅ | quota |
| Inconsistency | ✅ | conflict tests |
| Accept share | ✅ | sharing |
| Share | ✅ | sharing (happy path); validation errors ❌ |
| Sync error | ❌ | — |
| Check update | ❌ | — |
| Delete history | ❌ | — |
| Delete payment method | 🟡 | exercised within subscription flows |
| Info dialog | 🟡 | incidental |
| Password generator | ❌ | — |
| Save empty node | ❌ | (feature currently disabled in code) |

Cancel/Escape/Enter paths and phone-layout rendering of all dialogs: ❌.

---

## 16. Existing Coverage Map & Gaps

### Covered today (playwright/*.spec.ts, desktop-web Chromium)

| Spec | Area | Depth |
| --- | --- | --- |
| `account-less`, `local-account`, `cloud-account` | Per-account-type basics: offline/online, API-call auditing, note CRUD, move/copy matrices, settings/menu gating | Thorough for tree ops + capability gating |
| `account-mutations` | Up/downgrades incl. username/password variants, delete account, change username/password + failures, reserved usernames | Thorough, incl. persistence across logout/login |
| `pin` | Set/verify/incorrect/multi-account/no-account, change PIN, clear PIN | Thorough |
| `password-desync` | Password changed elsewhere: 5 recovery paths | Thorough |
| `keyboard` | Cut/copy/paste/delete/rename/duplicate shortcuts | Good for tree shortcuts only |
| `system-notes` | System-note protection via menus and keyboard; recycle + empty bin | Thorough |
| `conflict-test` | Exhaustive text auto-merge table, rename conflicts, inconsistency dialog | Thorough for auto-merge; interactive banner untested; move/delete conflict tests exist but are ⏸ skipped |
| `sync-test`, `shared-sync` | Two-device and two-user live sync incl. editing protection | Good |
| `sharing` | Full share lifecycle, guards, key-change matrix, properties participants | Thorough (happy paths) |
| `network` | No-network login, offline/online mechanics, connection loss | Good |
| `quota` | All count/size limit scenarios incl. share interactions and upgrade path | Thorough |
| `subscription` | Purchase, plan changes, billing address + email verification, renewal/failure/recovery matrix, payment methods, abort paths, currencies, deletion cleanup | Thorough — re-enabled + repaired 2026-07-03 (was skipped since 2026-02-01) |
| `post-plan` | Forced initial plan chooser | ⏸ Obsolete — flow removed from app Sept 2025; delete or re-wire |
| `editor` | Shared editor behavior contract run against **both** Monaco and ProseMirror: type/save/persist, dirty-state tracking, undo/redo, heading/list/code-block/inline-code formatting, mark/unmark/copy password, mode toggle with unsaved changes, full find/replace contract (via `findUI` adapter), word wrap, checkbox toggling + serializer round-trip (ProseMirror) | Good; input rules, scroll, shortcuts still open |
| `search` | Search all notes: tree filtering to matches + ancestors, title/text case-insensitive matching, auto-select, no-results, close/clear, Ctrl+Shift+F from both editors | Good (2026-07-04); mobile flow open |
| `note-history` | Version list + content per version, keyboard navigation, read-more paging of archives, delete old/all history incl. cancel and reload verification | Thorough (2026-07-04) |
| `recycle-bin` | Restore by cut/paste with content/children intact, single permanent delete + cancel, in-bin menu restrictions, empty bin (tree + settings page), inconsistency scan (clean path) | Thorough (2026-07-04) |
| `drag` | Basic drag & drop moves (online/offline/local), system-note drag protection | Basic |
| `note-tree` | Copy path to clipboard, duplicate via context menu, properties page details (sizes/dates/key) | Good (2026-07-04) |
| `settings` | General page: theme light/dark switch, language switch with live UI + system-note retitling | Basic (2026-07-04) |
| `share-validation` | Share-dialog error paths: empty username, share-with-self, unknown recipient | Good (2026-07-04) |

Note: test contexts start in the app-default editor (ProseMirror on a new install). The old
`defaultEditor: 'code'` localStorage seed in the framework was removed; suites that depend on Monaco
opt in explicitly via `ensureEditorMode('code')` (`playwright/editor/mode.ts`).

### Notable gaps (candidates for new suites, roughly by impact)

1. **Leftovers from the disabled-suite recovery** — `subscription.spec.ts` is re-enabled and green
   (2026-07-03). Remaining decisions: (a) `post-plan.spec.ts` + unused `InitialPlanChooser.vue` — delete or
   re-wire; (b) the 2 skipped conflict tests guard a **disabled product behavior** (automatic consistency
   check, off since Sept 2025) whose absence demonstrably lets trees diverge permanently across devices on
   concurrent moves — re-enabling the check or extending the conflict resolver is a product decision (see §5.5).
2. **Editor details** — largely covered by `editor.spec.ts` now; still open: ProseMirror input rules and
   autocomplete, keyboard shortcuts for undo/redo/save, scroll-position preservation, read-only enforcement,
   syntax highlighting, mobile selection control, lost-update error surfacing.
3. ~~**Note history**~~ — covered by `note-history.spec.ts` (2026-07-04).
4. **Interactive conflict resolution** — the conflict banner (keep local/server/both, navigation); only
   silent auto-merge outcomes are verified today.
5. ~~**Search all notes**~~ — covered by `search.spec.ts` (2026-07-04); mobile flow still open.
6. **Import/export** — zero coverage (Electron; needs ipc mocking or a real Electron run).
7. ~~**Recycle bin details**~~ — covered by `recycle-bin.spec.ts` (2026-07-04); inconsistency scan page still open.
8. **Settings pages** — general page language/theme now covered (`settings.spec.ts`, 2026-07-04);
   fonts & colors and updates pages still zero behavioral coverage.
9. **Notifications & dev blog UI** — unread counts, mark-as-read, click-through, blog posts.
10. **Password generator** (properties-page details now covered via `note-tree.spec.ts` /
    `note-history.spec.ts`, 2026-07-04).
11. **Share edge cases** — dialog validation ✅ (`share-validation.spec.ts`, 2026-07-04);
    share offers list and accept-while-offline still open.
12. **Anonymous cloud accounts** and the create-password claim flow.
13. **Platform matrix** — everything currently runs only as desktop-web Chromium; need runs for mobile
    viewport/touch (phone + tablet), real iOS/Android (Capacitor), Electron (tray, import/export, PIN,
    window management), macOS menu behavior, Linux packaging variants.
14. **Localization/theming sweeps** — smoke-run key flows in zh/da/de and dark mode (screenshot based).
15. **Drag & drop details** — drop-position variants, auto-expand on hover, drop indicators (basic drag
    moves + system-note protection now covered by `drag.spec.ts`).

### Suggested platform × suite execution matrix

| Suite | Web desktop | Web mobile viewport | Electron Win/Mac/Linux | iOS | Android |
| --- | --- | --- | --- | --- | --- |
| Accounts, tree, editors, search, history | ✅ (exists/extend) | ➕ | ➕ | ➕ | ➕ |
| Sharing, sync, conflicts, quota | ✅ | ➕ (one leg mobile) | ➕ smoke | ➕ smoke | ➕ smoke |
| Subscription | ✅ | n/a (gated) | ➕ | n/a | n/a |
| Import/export, PIN, tray, updates | n/a | n/a | ➕ (primary) | n/a | n/a |
| Settings, notifications, l10n/theme smoke | ➕ | ➕ | ➕ | ➕ | ➕ |

✅ = exists today · ➕ = to build · n/a = feature gated off on that platform

Test infrastructure already available to build on: `playwright/framework/` (fixtures, mimiri-context with
multi-instance cloning for multi-device tests, orchestration client for multi-user scenarios, Mailpit client
for email verification), shared action/check libraries in `playwright/core`,
`playwright/notes`, `playwright/subscription`, `playwright/deletion` (billing-cleanup checks), and
`data-testid` attributes throughout the components.
