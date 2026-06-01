// scripts/buildHymnsDatabase.js
//
// Builds ONLY the Hymns database (dev .db + prod .zip) and copies it into the
// android and ios asset folders. Bible artifacts are left untouched.
//
// Run:  yarn build:hymns

const fs = require('fs');
const path = require('path');

const {
  getAssetsPaths,
  getSourceDataPaths,
  getDatabasePaths,
  ensureDirectory,
  copyFileSafe,
  normalizePathForDisplay,
} = require('./utils/paths');

const {
  normalizeForFtsContent,
  normalizeHymnAuthors,
  runAsync,
  allAsync,
  finalizeAsync,
  closeAsync,
  applyBuildPragmas,
  stampUserVersion,
  createZipFromDb,
  reportSize,
  sqlite3,
} = require('./utils/buildDb');

const { HYMNS_DB_VERSION } = require('./utils/dbVersions');

const {
  createJsonHymnLoader,
} = require('./source-data/hymns/loaders/jsonHymnLoader');
const {
  createYamlHymnLoader,
} = require('./source-data/hymns/loaders/yamlHymnLoader');

async function buildHymns(dbPath) {
  console.log('🎵 Building Hymns...');
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

  const db = new sqlite3.Database(dbPath);
  await applyBuildPragmas(db);

  await runAsync(db, `CREATE TABLE Hymns (
    id TEXT PRIMARY KEY,
    number INTEGER NOT NULL,
    category TEXT,
    title TEXT,
    authors TEXT
  )`);

  await runAsync(db, `CREATE TABLE HymnVerses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hymn_id TEXT NOT NULL,
    verse_number INTEGER NOT NULL,
    text TEXT NOT NULL,
    is_chorus BOOLEAN NOT NULL DEFAULT 0,
    FOREIGN KEY (hymn_id) REFERENCES Hymns (id) ON DELETE CASCADE,
    UNIQUE(hymn_id, verse_number) ON CONFLICT REPLACE
  )`);

  // Hymns metadata FTS keeps small UNINDEXED columns so the search hook can
  // resolve hymn_id without a second join.
  await runAsync(db, `CREATE VIRTUAL TABLE HymnsFts USING fts5(
    title_plain,
    authors_plain,
    hymn_id UNINDEXED,
    number UNINDEXED,
    category UNINDEXED,
    tokenize='unicode61 remove_diacritics 2',
    prefix='2 3 4'
  )`);

  // Verses FTS is contentless to save the most space (verse text is the bulk).
  await runAsync(db, `CREATE VIRTUAL TABLE HymnVersesFts USING fts5(
    text_plain,
    tokenize='unicode61 remove_diacritics 2',
    prefix='2 3 4',
    content=''
  )`);

  // ---- Import hymns ----
  //
  // Source loaders implement a tiny shared interface ({ sourcePath, load() }
  // yielding HymnRecord values; see scripts/source-data/hymns/loaders/types.js).
  // The builder doesn't know or care about format — adding a new category in
  // a new format means: write a loader, append it here. The insert / FTS /
  // VACUUM logic below stays identical regardless of source.
  const sourcePaths = getSourceDataPaths();
  const hymnsDir = sourcePaths.hymns;
  const loaders = [
    createJsonHymnLoader(path.join(hymnsDir, '01_fihirana_ffpm.json'), 'ffpm'),
    createJsonHymnLoader(path.join(hymnsDir, '02_fihirana_fanampiny.json'), 'ff'),
    createJsonHymnLoader(path.join(hymnsDir, '03_antema.json'), 'antema'),
    createYamlHymnLoader(path.join(hymnsDir, 'song_song_fifohazana.yaml'), 'fifo'),
  ];

  const insHymn = db.prepare(
    `INSERT OR REPLACE INTO Hymns (id, number, category, title, authors) VALUES (?, ?, ?, ?, ?)`
  );
  const insVerse = db.prepare(
    `INSERT OR REPLACE INTO HymnVerses (hymn_id, verse_number, text, is_chorus) VALUES (?, ?, ?, ?)`
  );
  const insHymnAsync = (p) =>
    new Promise((res, rej) => insHymn.run(p, (e) => (e ? rej(e) : res())));
  const insVerseAsync = (p) =>
    new Promise((res, rej) => insVerse.run(p, (e) => (e ? rej(e) : res())));

  for (const loader of loaders) {
    if (!fs.existsSync(loader.sourcePath)) continue;
    for (const hymn of loader.load()) {
      const authors = hymn.authors.length > 0 ? JSON.stringify(hymn.authors) : null;
      await insHymnAsync([
        hymn.id,
        hymn.number,
        hymn.category || '',
        hymn.title,
        authors,
      ]);
      for (const verse of hymn.verses) {
        await insVerseAsync([
          hymn.id,
          verse.number,
          verse.text,
          verse.isChorus ? 1 : 0,
        ]);
      }
    }
  }

  await finalizeAsync(insHymn);
  await finalizeAsync(insVerse);

  // ---- Populate FTS ----
  const hymnRows = await allAsync(
    db,
    `SELECT rowid, id, number, category, title, authors FROM Hymns`
  );
  const insHymnsFts = db.prepare(
    `INSERT INTO HymnsFts(rowid, title_plain, authors_plain, hymn_id, number, category) VALUES (?, ?, ?, ?, ?, ?)`
  );
  const insHymnsFtsAsync = (p) =>
    new Promise((res, rej) => insHymnsFts.run(p, (e) => (e ? rej(e) : res())));

  for (const h of hymnRows) {
    const titlePlain = normalizeForFtsContent(String(h.title || ''));
    const authorsPlain = normalizeForFtsContent(
      normalizeHymnAuthors(String(h.authors || ''))
    );
    await insHymnsFtsAsync([
      h.rowid,
      titlePlain,
      authorsPlain,
      h.id,
      Number(h.number) || 0,
      String(h.category || ''),
    ]);
  }
  await finalizeAsync(insHymnsFts);

  const verseRows = await allAsync(db, `SELECT id, text FROM HymnVerses`);
  const insVersesFts = db.prepare(`INSERT INTO HymnVersesFts(rowid, text_plain) VALUES (?, ?)`);
  const insVersesFtsAsync = (p) =>
    new Promise((res, rej) => insVersesFts.run(p, (e) => (e ? rej(e) : res())));
  for (const r of verseRows) {
    await insVersesFtsAsync([r.id, normalizeForFtsContent(String(r.text || ''))]);
  }
  await finalizeAsync(insVersesFts);

  console.log(`  ↳ ${hymnRows.length} hymns, ${verseRows.length} verses indexed`);

  console.log('  optimizing FTS + VACUUM ...');
  await runAsync(db, `INSERT INTO HymnsFts(HymnsFts) VALUES('optimize')`);
  await runAsync(db, `INSERT INTO HymnVersesFts(HymnVersesFts) VALUES('optimize')`);
  await runAsync(db, `ANALYZE`);
  await runAsync(db, `VACUUM`);

  // Stamp content version AFTER VACUUM so the value lands in the final header.
  await stampUserVersion(db, HYMNS_DB_VERSION);

  await closeAsync(db);
  console.log(`✅ Hymns built: ${normalizePathForDisplay(dbPath)}`);
}

async function main() {
  const startedAt = Date.now();

  const assetsPaths = getAssetsPaths();
  const databasePaths = getDatabasePaths();

  ensureDirectory(assetsPaths.dev);
  ensureDirectory(assetsPaths.prod);
  ensureDirectory(assetsPaths.android.dev);
  ensureDirectory(assetsPaths.android.prod);
  ensureDirectory(assetsPaths.ios.dev);
  ensureDirectory(assetsPaths.ios.prod);

  const hymnsDev = databasePaths.hymns.dev;
  const hymnsProd = databasePaths.hymns.prod;

  // Wipe ONLY Hymns artifacts.
  for (const p of [
    hymnsDev,
    hymnsProd,
    databasePaths.hymns.androidDev,
    databasePaths.hymns.androidProd,
    databasePaths.hymns.iosDev,
    databasePaths.hymns.iosProd,
  ]) {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }

  await buildHymns(hymnsDev);

  console.log('\n📦 Copying dev DB to platform asset folders...');
  copyFileSafe(hymnsDev, databasePaths.hymns.androidDev);
  copyFileSafe(hymnsDev, databasePaths.hymns.iosDev);

  console.log('🗜️  Creating max-compression ZIP for prod...');
  await createZipFromDb(hymnsDev, hymnsProd);

  console.log('📦 Copying prod ZIP to platform asset folders...');
  copyFileSafe(hymnsProd, databasePaths.hymns.androidProd);
  copyFileSafe(hymnsProd, databasePaths.hymns.iosProd);

  console.log('\n📊 Hymns size audit\n');
  reportSize('Hymns.db (root)', hymnsDev);
  reportSize('Hymns.db (android)', databasePaths.hymns.androidDev);
  reportSize('Hymns.db (ios)', databasePaths.hymns.iosDev);
  reportSize('Hymns.zip (root)', hymnsProd);
  reportSize('Hymns.zip (android)', databasePaths.hymns.androidProd);
  reportSize('Hymns.zip (ios)', databasePaths.hymns.iosProd);

  console.log(`\n⏱️  Hymns build done in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('❌ Hymns build failed:', err);
    process.exit(1);
  });
}

module.exports = { buildHymns, main };
