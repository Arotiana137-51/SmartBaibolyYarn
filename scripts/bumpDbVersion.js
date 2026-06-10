#!/usr/bin/env node
/**
 * Atomically bump BIBLE_DB_VERSION and/or HYMNS_DB_VERSION in BOTH
 *   - src/services/database/dbVersions.ts  (read by the app)
 *   - scripts/utils/dbVersions.js          (read by build scripts)
 * so they can never drift out of sync.
 *
 * Usage:
 *   node scripts/bumpDbVersion.js --target=bible
 *   node scripts/bumpDbVersion.js --target=hymns --version=20260530
 *   node scripts/bumpDbVersion.js --target=both
 *
 * Defaults:
 *   --target  required (bible | hymns | both)
 *   --version today's date as YYYYMMDD
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const TS_PATH = path.join(REPO_ROOT, 'src/services/database/dbVersions.ts');
const JS_PATH = path.join(REPO_ROOT, 'scripts/utils/dbVersions.js');

function parseArgs(argv) {
  const out = {};
  for (const a of argv.slice(2)) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function todayYyyymmdd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return Number(`${y}${m}${day}`);
}

function rewrite(filePath, replacer) {
  const before = fs.readFileSync(filePath, 'utf8');
  const after = replacer(before);
  if (after === before) {
    console.warn(`No change applied to ${path.relative(REPO_ROOT, filePath)}`);
    return false;
  }
  fs.writeFileSync(filePath, after, 'utf8');
  return true;
}

function bumpKey(content, key, value) {
  const re = new RegExp(`(\\b${key}\\s*[:=]\\s*)(\\d+)`, 'g');
  if (!re.test(content)) {
    throw new Error(`Could not find ${key} in file content`);
  }
  return content.replace(
    new RegExp(`(\\b${key}\\s*[:=]\\s*)(\\d+)`, 'g'),
    `$1${value}`,
  );
}

function main() {
  const args = parseArgs(process.argv);
  const target = (args.target || '').toLowerCase();
  if (!['bible', 'hymns', 'both'].includes(target)) {
    console.error(
      'Error: --target=bible | hymns | both is required.\n' +
        'Example: node scripts/bumpDbVersion.js --target=bible',
    );
    process.exit(1);
  }
  const version = Number(args.version ?? todayYyyymmdd());
  if (!Number.isInteger(version) || version < 20000000 || version > 99999999) {
    console.error(
      `Error: --version=${args.version} is not a valid YYYYMMDD integer.`,
    );
    process.exit(1);
  }

  const keys = [];
  if (target === 'bible' || target === 'both') keys.push('BIBLE_DB_VERSION');
  if (target === 'hymns' || target === 'both') keys.push('HYMNS_DB_VERSION');

  for (const file of [TS_PATH, JS_PATH]) {
    rewrite(file, src => {
      let next = src;
      for (const k of keys) next = bumpKey(next, k, version);
      return next;
    });
  }

  console.log(`Bumped ${keys.join(', ')} → ${version}`);
  console.log('Updated files:');
  console.log(`  ${path.relative(REPO_ROOT, TS_PATH)}`);
  console.log(`  ${path.relative(REPO_ROOT, JS_PATH)}`);
  console.log(
    '\nNext: rebuild the affected database(s):' +
      `${
        target === 'bible' || target === 'both'
          ? '\n  node scripts/buildBibleDatabase.js'
          : ''
      }${
        target === 'hymns' || target === 'both'
          ? '\n  node scripts/buildHymnsDatabase.js'
          : ''
      }`,
  );
}

// Run the CLI only when invoked directly. When required (e.g. by
// scripts/utils/autoVersion.js) we just expose the reusable helpers so the
// two-file atomic rewrite logic stays single-source.
if (require.main === module) {
  main();
}

module.exports = { todayYyyymmdd, bumpKey, rewrite, TS_PATH, JS_PATH };
