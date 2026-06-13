# iOS CI & release

The iOS build pipeline lives in `.github/workflows/`:

- `ios-build.yml` — unsigned **simulator** build on `macos-latest`. Installs
  deps, builds the DBs, runs `pod install`, then `xcodebuild ... clean build`
  for `generic/platform=iOS Simulator` with signing disabled. Triggers on push
  to `main`/`develop`/`feature/*`, PRs, and `workflow_dispatch`.
- `ios-build-signed.yml` — signed device/archive build for distribution.

> These workflows currently live on the `feature/ios-github-actions` /
> `ios-build-workflow` branches and have not yet merged to `main`.

## What CI can and cannot verify

CI **compiles** the app — it catches build, Pod, and linker breakage. It does
**not** launch the app: there is no booted device, no signed-in iCloud account,
and no backup run. So anything that depends on the iOS *runtime* — including the
iCloud backup-exclusion behavior below — cannot be validated by CI and must be
checked manually on a Mac.

## Manual: verify the iCloud backup exclusion

Background: the bundled Bible/Hymns SQLite DBs live in
`<Documents>/default/` and are flagged with `NSURLIsExcludedFromBackupKey` so
they are not copied into iCloud/Finder backups (they re-extract from the app
bundle on launch). User data — favorites, notes, highlights — lives in
AsyncStorage under `Application Support/<bundleID>/`, a separate tree that *is*
backed up. See `excludeDatabaseDirFromBackup()` in `src/utils/paths.ts` and
"Data persistence & backup behavior" in `CROSS_PLATFORM_GUIDE.md`.

This requires a Mac with Xcode. **It cannot be done from Windows** (no Xcode, no
simulator, no iOS toolchain).

### 1. Build and launch once

```sh
yarn ios            # or run the SmartBaibolyYarn scheme from Xcode
```

Open the app and visit the Bible and Hymns readers once, so both DBs extract to
`<Documents>/default/BibleMG65.db` and `Hymns.db`.

### 2. Locate the app's data container (simulator)

Use the iOS bundle identifier from `ios/SmartBaibolyYarn.xcodeproj` —
`PRODUCT_BUNDLE_IDENTIFIER`. As of the iOS-CI branches this is still the React
Native default `org.reactjs.native.example.SmartBaibolyYarn` (it has not been
renamed to the Android `com.ebaiboly.app`); use whatever the project actually
sets.

```sh
xcrun simctl get_app_container booted org.reactjs.native.example.SmartBaibolyYarn data
# -> .../data/Containers/Data/Application/<UUID>
```

The DBs are under `<container>/Documents/default/`.

### 3. Confirm the flag is set (authoritative check)

Read the resource value back — this is what the OS actually consults, so it is
the definitive test. Run on the DB file (adjust the path from step 2):

```sh
swift - "<container>/Documents/default/BibleMG65.db" <<'SWIFT'
import Foundation
let url = URL(fileURLWithPath: CommandLine.arguments[1])
let v = try url.resourceValues(forKeys: [.isExcludedFromBackupKey])
print("isExcludedFromBackup =", v.isExcludedFromBackup ?? false)
SWIFT
```

Expected: `isExcludedFromBackup = true`. Repeat for `Hymns.db`. The directory
itself (`<container>/Documents/default`) should report `true` as well, since the
flag is applied to the directory.

Negative control — a user-data path should **not** be excluded. The
AsyncStorage tree (`<container>/Library/Application Support/<bundleID>/RCTAsyncLocalStorage_V1`,
where `<bundleID>` is the same identifier from step 2) should report `false` /
be absent, confirming the exclusion is surgical and is not sweeping up data we
want backed up.

### 4. Real device (optional, end-to-end)

On a physical device signed into iCloud: Settings → [your name] → iCloud →
Manage Account Storage → Backups → this device. After a backup, the app's
backup size should reflect AsyncStorage only — it should **not** grow by the
~14.5 MB of bundled DBs. (Note: an uninstall/reinstall test alone does *not*
prove exclusion — the DBs re-extract from the bundle regardless of backup state.)

## Pass criteria

- [ ] CI `ios-build.yml` is green (app compiles).
- [ ] Step 3: both DBs and the `default/` directory report `isExcludedFromBackup = true`.
- [ ] Step 3 negative control: AsyncStorage tree is not excluded.
- [ ] Step 4 (optional): device iCloud backup size does not include the bundled DBs.
