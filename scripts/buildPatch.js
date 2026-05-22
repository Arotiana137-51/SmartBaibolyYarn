#!/usr/bin/env node
/**
 * Build an OTA patch file from a row-level diff of the YAML/JSON source
 * data between a previous git commit and the current working tree.
 *
 * Why: shipping a 3-word typo fix as a full APK update is wasteful for our
 * Madagascar users where data is expensive. This script emits a tiny JSON
 * file (~200 bytes per typo) that the on-device PatchManager will fetch
 * from GitHub Pages and apply via UPDATE statements.
 *
 * Usage:
 *   node scripts/buildPatch.js --target=bible  --since=<git-ref>  --version=20260605
 *   node scripts/buildPatch.js --target=hymns  --since=v1.2.0     --version=20260610
 *
 * Arguments:
 *   --target   bible | hymns                            (required)
 *   --since    any git ref: SHA, tag, branch name, or
 *              HEAD~N. Compared against the working tree
 *              to discover changed rows.                (required)
 *   --version  YYYYMMDD integer for this patch. Must be
 *              strictly greater than the on-disk version
 *              we're patching FROM. Should equal the
 *              value you also bumped in dbVersions.ts.  (required)
 *   --dry-run  print the diff but do not write files.   (optional)
 *
 * Output:
 *   docs/patches/<target>/<version>.json   (the patch payload)
 *   docs/patches/<target>/index.json       (updated, version appended)
 *
 * Workflow after running:
 *   1. yarn bump:db-version -- --target=<target> --version=<version>
 *   2. yarn build:patch  -- --target=<target> --since=<prev> --version=<version>
 *   3. yarn build:<target>            (rebuild bundled DB so fresh installs
 *                                       also get the fix; ships in next APK)
 *   4. git add docs/patches/... && git push
 *      GitHub Pages republishes → connected users pick it up.
 */

const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');
const yaml = require('js-yaml');

const {getSourceDataPaths} = require('./utils/paths');
const {normalizeForFtsContent, normalizeHymnAuthors} = require('./utils/buildDb');

const REPO_ROOT = path.resolve(__dirname, '..');
const DOCS_PATCHES_DIR = path.join(REPO_ROOT, 'docs', 'patches');

function parseArgs(argv) {
  const out = {};
  for (const a of argv.slice(2)) {
    if (a === '--dry-run') {
      out['dry-run'] = '1';
      continue;
    }
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});
}

/**
 * Read a file at a specific git ref. Returns null if the file didn't
 * exist at that ref (newly added files have no "before" state to diff).
 */
function gitShow(ref, repoRelativePath) {
  try {
    // The forward-slash form is what git wants on every platform, even
    // when the on-disk path uses backslashes on Windows.
    const gitPath = repoRelativePath.split(path.sep).join('/');
    return execSync(`git show ${ref}:${gitPath}`, {
      cwd: REPO_ROOT,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024,
    });
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Bible diff
// ---------------------------------------------------------------------------

function loadBibleVersesYaml(yamlText) {
  if (!yamlText) return new Map();
  const raw = yaml.load(yamlText) || {};
  const rows = new Map(); // key: `${book}|${chapter}|${verse}` -> {text, title}
  for (const value of Object.values(raw)) {
    const rawBook = String(value?.verse_book || '');
    const m = rawBook.match(/^(?:mg_)?(\d+)$/i);
    const bookId = m ? Number(m[1]) : null;
    if (!bookId) continue;
    const chapter = Number(value?.verse_chapter);
    const verseNumber = Number(value?.verse_number);
    if (!Number.isFinite(chapter) || !Number.isFinite(verseNumber)) continue;
    const text = String(value?.verse_text || '');
    const title =
      value?.verse_title == null ? null : String(value.verse_title);
    rows.set(`${bookId}|${chapter}|${verseNumber}`, {
      book_id: bookId,
      chapter,
      verse_number: verseNumber,
      text,
      title,
    });
  }
  return rows;
}

function diffBibleVerses(sinceRef) {
  const sourcePaths = getSourceDataPaths();
  const yamlDir = path.join(sourcePaths.bible, 'Yaml_Zo_Source');
  const changed = [];

  for (let bookId = 1; bookId <= 66; bookId += 1) {
    const fileName = `bible_verse_mg1865_mg_${bookId}.yaml`;
    const abs = path.join(yamlDir, fileName);
    const repoRel = path.relative(REPO_ROOT, abs);

    if (!fs.existsSync(abs)) continue;
    const currentText = fs.readFileSync(abs, 'utf8');
    const previousText = gitShow(sinceRef, repoRel);

    const current = loadBibleVersesYaml(currentText);
    const previous = loadBibleVersesYaml(previousText);

    for (const [key, row] of current) {
      const prev = previous.get(key);
      if (!prev || prev.text !== row.text || prev.title !== row.title) {
        changed.push(row);
      }
    }
  }
  return changed;
}

function buildBiblePatch(sinceRef, version) {
  const verses = diffBibleVerses(sinceRef).map(v => ({
    book_id: v.book_id,
    chapter: v.chapter,
    verse_number: v.verse_number,
    text: v.text,
    text_plain: normalizeForFtsContent(v.text),
    title: v.title,
  }));
  return {
    version,
    appliesTo: 'bible',
    verses,
    // Books table changes (chapter count, name) are rare; not diffed in v1.
    // Anything structural goes through an APK release anyway.
    books: [],
  };
}

// ---------------------------------------------------------------------------
// Hymns diff
// ---------------------------------------------------------------------------

const HYMN_SOURCE_FILES = [
  '01_fihirana_ffpm.json',
  '02_fihirana_fanampiny.json',
  '03_antema.json',
  '04_fifohazana.json',
];

function loadHymnsJson(jsonText) {
  if (!jsonText) return {hymns: new Map(), verses: new Map()};
  let data;
  try {
    data = JSON.parse(jsonText);
  } catch {
    return {hymns: new Map(), verses: new Map()};
  }
  const hymns = new Map();
  const verses = new Map();
  for (const [hymnId, hymn] of Object.entries(data)) {
    const authors =
      Array.isArray(hymn.mpanoratra) && hymn.mpanoratra.length > 0
        ? JSON.stringify(hymn.mpanoratra)
        : null;
    hymns.set(hymnId, {
      id: hymnId,
      number: parseInt(hymn.laharana, 10) || 0,
      category: String(hymn.sokajy || ''),
      title: String(hymn.lohateny || ''),
      authors,
    });
    for (const v of hymn.hira || []) {
      verses.set(`${hymnId}|${v.andininy}`, {
        hymn_id: hymnId,
        verse_number: Number(v.andininy),
        text: String(v.tononkira || ''),
        is_chorus: v.fiverenany ? 1 : 0,
      });
    }
  }
  return {hymns, verses};
}

function diffHymns(sinceRef) {
  const sourcePaths = getSourceDataPaths();
  const changedHymns = [];
  const changedVerses = [];

  for (const fileName of HYMN_SOURCE_FILES) {
    const abs = path.join(sourcePaths.hymns, fileName);
    const repoRel = path.relative(REPO_ROOT, abs);
    if (!fs.existsSync(abs)) continue;

    const currentText = fs.readFileSync(abs, 'utf8');
    const previousText = gitShow(sinceRef, repoRel);

    const current = loadHymnsJson(currentText);
    const previous = loadHymnsJson(previousText);

    for (const [id, hymn] of current.hymns) {
      const prev = previous.hymns.get(id);
      if (
        !prev ||
        prev.number !== hymn.number ||
        prev.category !== hymn.category ||
        prev.title !== hymn.title ||
        prev.authors !== hymn.authors
      ) {
        changedHymns.push(hymn);
      }
    }
    for (const [key, verse] of current.verses) {
      const prev = previous.verses.get(key);
      if (
        !prev ||
        prev.text !== verse.text ||
        prev.is_chorus !== verse.is_chorus
      ) {
        changedVerses.push(verse);
      }
    }
  }

  return {changedHymns, changedVerses};
}

function buildHymnsPatch(sinceRef, version) {
  const {changedHymns, changedVerses} = diffHymns(sinceRef);
  return {
    version,
    appliesTo: 'hymns',
    hymns: changedHymns.map(h => ({
      id: h.id,
      number: h.number,
      category: h.category,
      title: h.title,
      title_plain: normalizeForFtsContent(h.title),
      authors: h.authors,
      authors_plain: normalizeForFtsContent(
        normalizeHymnAuthors(h.authors || '')
      ),
    })),
    hymnVerses: changedVerses.map(v => ({
      hymn_id: v.hymn_id,
      verse_number: v.verse_number,
      text: v.text,
      text_plain: normalizeForFtsContent(v.text),
      is_chorus: v.is_chorus,
    })),
  };
}

// ---------------------------------------------------------------------------
// index.json management
// ---------------------------------------------------------------------------

function loadIndex(target) {
  const indexPath = path.join(DOCS_PATCHES_DIR, target, 'index.json');
  if (!fs.existsSync(indexPath)) {
    return {latest: 0, patches: [], minBaseline: 0};
  }
  try {
    return JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  } catch {
    return {latest: 0, patches: [], minBaseline: 0};
  }
}

function writeIndex(target, idx) {
  const dir = path.join(DOCS_PATCHES_DIR, target);
  ensureDir(dir);
  fs.writeFileSync(
    path.join(dir, 'index.json'),
    JSON.stringify(idx, null, 2) + '\n',
    'utf8'
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv);
  const target = (args.target || '').toLowerCase();
  if (!['bible', 'hymns'].includes(target)) {
    console.error('Error: --target=bible | hymns is required.');
    process.exit(1);
  }
  const sinceRef = args.since;
  if (!sinceRef) {
    console.error('Error: --since=<git-ref> is required.');
    process.exit(1);
  }
  const version = Number(args.version);
  if (!Number.isInteger(version) || version < 20000000 || version > 99999999) {
    console.error(
      `Error: --version=${args.version} is not a valid YYYYMMDD integer.`
    );
    process.exit(1);
  }
  const dryRun = args['dry-run'] === '1';

  const patch =
    target === 'bible'
      ? buildBiblePatch(sinceRef, version)
      : buildHymnsPatch(sinceRef, version);

  const rowCount =
    target === 'bible'
      ? patch.verses.length + patch.books.length
      : patch.hymns.length + patch.hymnVerses.length;

  if (rowCount === 0) {
    console.log(
      `No changes detected between ${sinceRef} and working tree for ${target}.`
    );
    console.log('Nothing to publish.');
    return;
  }

  console.log(
    `Found ${rowCount} changed row(s) for ${target} since ${sinceRef}:`
  );
  if (target === 'bible') {
    for (const v of patch.verses) {
      console.log(`  Verses ${v.book_id} ${v.chapter}:${v.verse_number}`);
    }
  } else {
    for (const h of patch.hymns) console.log(`  Hymns ${h.id}`);
    for (const v of patch.hymnVerses) {
      console.log(`  HymnVerses ${v.hymn_id} v${v.verse_number}`);
    }
  }

  if (dryRun) {
    console.log('\n--dry-run: not writing files.');
    return;
  }

  const targetDir = path.join(DOCS_PATCHES_DIR, target);
  ensureDir(targetDir);
  const patchPath = path.join(targetDir, `${version}.json`);
  fs.writeFileSync(patchPath, JSON.stringify(patch, null, 2) + '\n', 'utf8');

  const idx = loadIndex(target);
  if (!idx.patches.includes(version)) {
    idx.patches = [...new Set([...idx.patches, version])].sort((a, b) => a - b);
  }
  idx.latest = Math.max(idx.latest, version);
  if (!idx.minBaseline) {
    // First patch ever: declare the floor as the version we're patching from.
    // If `since` is a YYYYMMDD-ish tag we can parse, use it; otherwise leave
    // 0 and the maintainer can hand-edit. The on-device check skips patching
    // when onDisk < minBaseline, so a too-low value just means more devices
    // qualify for incremental patches.
    const maybe = Number(sinceRef);
    if (Number.isInteger(maybe) && maybe >= 20000000 && maybe <= 99999999) {
      idx.minBaseline = maybe;
    }
  }
  writeIndex(target, idx);

  console.log(`\nWrote ${path.relative(REPO_ROOT, patchPath)}`);
  console.log(`Updated ${target}/index.json (latest=${idx.latest})`);
  console.log('\nNext:');
  console.log(`  yarn build:${target}      # rebuild bundled DB for new installs`);
  console.log(`  git add docs/patches/${target}/  src/services/database/dbVersions.ts`);
  console.log(`  git commit && git push    # GitHub Pages republishes`);
}

if (require.main === module) {
  main();
}

module.exports = {buildBiblePatch, buildHymnsPatch};
