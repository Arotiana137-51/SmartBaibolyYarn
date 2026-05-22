# OTA patch channel

These files are served via GitHub Pages from this repo's `main` branch (`Settings → Pages → Build from /docs folder`). They are fetched by the e-Baiboly app on each launch to apply tiny content corrections (typos, verse fixes) without forcing the user to download a full APK update.

**Do not edit by hand.** Use the patch builder:

```
yarn bump:db-version -- --target=bible --version=<YYYYMMDD>
yarn build:patch     -- --target=bible --since=<previous-git-ref> --version=<YYYYMMDD>
yarn build:bible     # fold the same change into the bundled DB
git add docs/patches/ src/services/database/dbVersions.ts scripts/utils/dbVersions.js android/ ios/
git commit && git push
```

## Layout

```
docs/patches/
  bible/
    index.json        ← {"latest", "patches": [...], "minBaseline"}
    <YYYYMMDD>.json   ← one file per published patch
  hymns/
    index.json
    <YYYYMMDD>.json
```

The app reads `index.json` first, then fetches every `<version>.json` newer than its on-disk `PRAGMA user_version`. Devices below `minBaseline` skip patching and wait for the next APK release (full re-extract).

## URLs

- Index: `https://arotiana137-51.github.io/e-Baiboly/patches/bible/index.json`
- Patch: `https://arotiana137-51.github.io/e-Baiboly/patches/bible/20260605.json`

## See also

- `src/services/database/PatchManager.ts` — fetch + apply logic on the app side.
- `src/services/database/patchSchema.ts` — schema + runtime validators.
- `scripts/buildPatch.js` — the builder.
- `src/services/database/dbVersions.ts` — bundled-DB content version constants.
