// scripts/utils/autoVersion.js
//
// Content-hash based auto-versioning for the DB build scripts.
//
// On each build the builder hashes its source files and asks planVersion()
// whether anything changed since the last build (tracked in the committed
// manifest scripts/utils/dbContentHashes.json). If the content is identical the
// existing version is reused — no needless inflation. If it changed, a new
// monotonic version is computed and, AFTER the DB builds + stamps successfully,
// commitVersion() rewrites both dbVersions files and updates the manifest.
//
// The version constants live in two kept-in-sync files; we only ever rewrite
// them through bumpKey() (shared with scripts/bumpDbVersion.js) so they can't
// drift. We deliberately read the current version from the .js file TEXT rather
// than require()-ing it, because the builders capture the constant at module
// load and a fresh rewrite mid-process would not be visible via the cache.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { todayYyyymmdd, bumpKey, rewrite, TS_PATH, JS_PATH } = require('../bumpDbVersion');

const MANIFEST_PATH = path.join(__dirname, 'dbContentHashes.json');

const TARGET_KEYS = {
  bible: 'BIBLE_DB_VERSION',
  hymns: 'HYMNS_DB_VERSION',
};

// sha256 over each existing source file's bytes, combined in a stable
// (sorted-path) order so the digest is deterministic regardless of input order.
// Missing files are skipped — mirrors the builders' own
// `if (!fs.existsSync(...)) continue` handling of optional sources.
function hashSources(filePaths) {
  const hash = crypto.createHash('sha256');
  const existing = filePaths
    .filter((p) => fs.existsSync(p))
    .sort();
  for (const p of existing) {
    // Include the basename so renaming a file (same bytes) is treated as a
    // change, and so an empty file list can never collide with a single empty
    // file. Use a NUL separator that can't occur in paths/content.
    hash.update(path.basename(p));
    hash.update('\0');
    hash.update(fs.readFileSync(p));
    hash.update('\0');
  }
  return hash.digest('hex');
}

function readManifest() {
  try {
    const raw = fs.readFileSync(MANIFEST_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeManifest(manifest) {
  fs.writeFileSync(
    MANIFEST_PATH,
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );
}

// Read the current version straight from the .js source-of-truth file text.
// Matches the `KEY: 12345678` shape that bumpKey() writes.
function readCurrentVersion(key) {
  const src = fs.readFileSync(JS_PATH, 'utf8');
  const m = src.match(new RegExp(`\\b${key}\\s*[:=]\\s*(\\d+)`));
  if (!m) {
    throw new Error(`Could not read ${key} from ${path.basename(JS_PATH)}`);
  }
  return Number(m[1]);
}

function assertTarget(target) {
  if (!TARGET_KEYS[target]) {
    throw new Error(`autoVersion: unknown target "${target}" (expected bible|hymns)`);
  }
}

// Pure decision — NO writes. Returns { version, changed, newHash }.
//  - content unchanged → reuse the current version.
//  - content changed   → version = max(todayYYYYMMDD, currentVersion + 1).
//    The +1 floor keeps versions strictly monotonic when content changes more
//    than once on the same calendar day, and never overflows SQLite's signed
//    32-bit user_version (a literal date+counter suffix would).
function planVersion({ target, sourceFiles }) {
  assertTarget(target);
  const key = TARGET_KEYS[target];

  const newHash = hashSources(sourceFiles);
  const currentVersion = readCurrentVersion(key);
  const manifest = readManifest();
  const prev = manifest[target];

  if (prev && prev.hash === newHash) {
    return { version: currentVersion, changed: false, newHash };
  }

  const version = Math.max(todayYyyymmdd(), currentVersion + 1);
  return { version, changed: true, newHash };
}

// Persist a bump — call ONLY after the DB built + stamped successfully, so a
// failed build never leaves the version files ahead of the shipped artifacts.
// Rewrites BIBLE_DB_VERSION / HYMNS_DB_VERSION in BOTH dbVersions files via the
// shared bumpKey(), then records the hash + version in the manifest.
function commitVersion({ target, version, newHash }) {
  assertTarget(target);
  const key = TARGET_KEYS[target];

  for (const file of [TS_PATH, JS_PATH]) {
    rewrite(file, (src) => bumpKey(src, key, version));
  }

  const manifest = readManifest();
  manifest[target] = { hash: newHash, version };
  writeManifest(manifest);
}

module.exports = { hashSources, planVersion, commitVersion, MANIFEST_PATH };
