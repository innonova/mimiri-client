# Versioning, bundles and release

**The web bundle is the unit of release.** Electron and the Capacitor apps are hosts that ship with a baked-in signed JS bundle and can replace it at runtime with a newer signed bundle downloaded from `update.mimiri.io`. Native store releases are comparatively rare and exist to move the host forward (new plugins, OS SDK requirements).

## Version fields (`package.json`)

| Field | Meaning |
|---|---|
| `version` | The web/bundle version. Stamped by `make-bundle`, compared by the updater. |
| `minElectronVersionWin32` / `Darwin` / `Linux` | Oldest Electron host that may run this bundle. `update-manager.ts` picks the one for the current platform and refuses/defers the bundle if the host is older. (`minElectronVersion` without suffix is the legacy Windows-only field.) |
| `minIosVersion` / `minAndroidVersion` | Same gate for the Capacitor hosts. |
| `iosVersion` / `androidVersion` | Version of the native host app currently published. Copied into `base-version.json` → `VersionInfo.swift`/`.java` as `HostVersion`, which the updater compares against the min-host gates. |

Other version locations:

- `src/version.ts` — committed as `'0.0.0'`; `npm run set-version` regenerates it from `package.json` at build time (`set-version increment` bumps the patch first). In dev, `vite.config.ts` injects `__DEV_VERSION__` which overrides it.
- `base-version.json` — `baseVersion` = the bundle baked into the native binary (the updater's fallback), plus `iosVersion`/`androidVersion`/`releaseDate`.
- `bundle-info.json` — `{url, hash}` of that baked-in bundle.
- Native store versions: `android/app/build.gradle` (`versionCode`, `versionName`; overridable via `MIMIRI_VERSION_CODE`/`MIMIRI_VERSION_NAME`) and `ios/App/App.xcodeproj` (`MARKETING_VERSION`, overridable from the workflow input). These are independent of the bundle version.

## Bumping the version

Every PR that changes shipped code bumps the patch version as part of the PR:

```bash
npm version patch --no-git-tag-version
```

Merging a new version to `main` triggers an automatic build and deploy of that version to the `canary` channel on `update.mimiri.io` (the trigger lives outside this repo's GitHub workflows). That is why doc-only or CI-only PRs should not bump: a bump is a canary release.

This updates `package.json` and `package-lock.json` only. Do **not** use `npm run set-version increment` for this — it also regenerates `src/version.ts`, which is committed as a `0.0.0` placeholder and only written at build time.

## Bundle pipeline

1. `npm run build` → `dist/`.
2. `npm run make-bundle <keyName> [channel=canary]` (`scripts/make-bundle.js`): gzips+base64s every file under `dist/` into one JSON document `{version, releaseDate, size, minElectronVersion{…}, minIosVersion, minAndroidVersion, files[], signatures[]}`, signs it RSASSA-PKCS1-v1_5/SHA-256 with `./certs/<keyName>.key` (signature is over the JSON *before* `signatures` is attached, matching `CryptSignature.verify`), and emits `bundles/<key>.<version>.json`, `.info.json`, the channel pointer `bundles/<key>.<channel>.json`, and `artifacts.json`. It no-ops if that version is already `stable` on `update.mimiri.io`.
3. Channels: `canary` → `stable`. Clients pick a channel in settings; `update-manager.ts` fetches `/<keyName>.<channel>.json`.
4. `npm run deploy-web` (`scripts/deploy-web.js`) — `scp -r ./dist/* $DEPLOY_TARGET` for app.mimiri.io.

Signing keys: `npm run create-key` (`scripts/create-key.js`) generates an RSA-3072 pair into gitignored `certs/<YYYYMMDD><8hex>.{key,pub}`. The current key name is `VITE_UPDATE_NAME` (`2024101797F6C918`); the public key is baked into the client as `VITE_UPDATE_PUBLIC_KEY` / `VITE_UPDATE_ALGORITHM`. `global.ts` builds `updateKeys` from these; multiple keys are supported for rotation (a bundle signed by a non-`current` key fails with `old-key`, an unknown signer with `key-not-found`).

## GitHub bundle build (migration in progress)

`.github/workflows/bundle.yml` runs the *unsigned* half of the pipeline on every push to `main`: `npm ci` → public build config (`.github/production-build.env`, containing only values that are baked into the shipped bundle anyway) → `set-version` → `build` → `npm run pack-bundle -- <keyName>` (`scripts/pack-bundle.js`, the packaging half of `make-bundle` — it emits `bundles/<key>.<version>.unsigned.json`, the exact byte payload the signature is computed over, plus a `.meta.json` with the min-host fields) → `tar` of `dist/` for app.mimiri.io. Both artifacts get sigstore build-provenance attestations (public Rekor log; verify with `gh attestation verify`) and are uploaded as the `bundle` workflow artifact.

Signing stays on-prem: the signer downloads the artifact, verifies the attestation, signs the unsigned payload with `certs/<key>.key`, appends `signatures`, and derives `info.json`/channel pointers from the meta file. Until that side exists, the legacy webhook-triggered `build-all-linux.sh` flow remains the production path.

## Runtime updater (`src/services/update-manager.ts`)

Only active when `ipcClient.isAvailable` (never on plain web).

- `check()` fetches the channel pointer, compares to the active bundle, and verifies the host is new enough. If the host is too old and the platform is not store-managed (`mimiriPlatform.isHostUpdateManaged`), it switches to a **host update**: downloads the signed `.nupkg`/`.zip` described by `latest.json`, verifies it, and hands it to `ipcClient.bundle.saveElectronUpdate` / `updateElectron`. Linux non-store installs get a download link matching their packaging format.
- `download(version)` streams the bundle with progress (`stage: download → verify → install`, errors `signature-invalid | old-key | key-not-found`), verifies the signature, then `ipcClient.bundle.save(version, bundle)`; `use(version)` / `activate()` switch and restart.
- `good()` (after a successful login) marks the running bundle good and prunes bundles that are not base/active/previous — the rollback safety net. `InstalledBundleInfo` carries `active/previous/good/base/hostVersion`.
- `UpdateMode` (settings): `auto-idle`, `auto-start`, `manual-strong`, `manual-discrete`, `manual-only`, `off`. `checkUpdateInitial()` runs before the UI and can hot-swap at startup; `idleActivate()` applies pending activations. The server pushes `bundle-update` over SignalR to trigger a check. Changelog comes from `/changelog.canary.json`.

## Mobile store releases

1. `npm run update-bundle` (`scripts/update-bundle.js`): fetches the current `canary` info, downloads the bundle, verifies the signature against `certs/<key>.pub`, and writes `bundle-info.json` + `base-version.json`. Commit both.
2. `npm run sync-prod` = `download-bundle` (curl + sha256 check, hard fail on mismatch) → `unpack-bundle` (wipes `dist/`, inflates the bundle into it) → `update-version-info` (generates `android/.../VersionInfo.java` and `ios/App/App/VersionInfo.swift` from `base-version.json`) → `cap sync`. The store build therefore ships the exact signed bundle that is live, reproducibly.
3. `.github/workflows/android-release.yml` (`workflow_dispatch`; inputs `track`, optional `versionName`/`versionCode`; environment `production`): `sync-prod` → keystore from `KEYSTORE_BASE64` → `gradlew bundleRelease` → `jarsigner -verify` → upload to Google Play (`io.mimiri.app`).
4. `.github/workflows/ios-release.yml` (`workflow_dispatch`, input `versionName`): macos runner with the Xcode version the App Store currently requires → `sync-prod` → App Store Connect API key → `xcodebuild archive` → `-exportArchive` with `destination=upload`.

Local development against a device uses `npm run sync-dev`: `capacitor.config.ts` points the native WebView at `VITE_MIMER_DEV_API_HOST` (live-reload from a dev server) when `NODE_ENV=development`.

## CI on every push/PR to `main`

- `ci.yml` — `npm run lint`, `npm run type-check`, `npm test`. Playwright is not run (it needs the live dev backend).
- `mobile.yml` — builds unsigned Android (`gradlew assembleRelease`) and iOS (`xcodebuild` with signing off) from `build-only` + `cap sync`, and fails if `cap sync` leaves a diff under `android/` or `ios/` (excluding `Podfile.lock`). Generated Capacitor files must be committed.
