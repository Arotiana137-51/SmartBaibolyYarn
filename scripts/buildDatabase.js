// scripts/buildDatabase.js
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');
const archiver = require('archiver');
const { 
  getAssetsPaths, 
  getSourceDataPaths, 
  getDatabasePaths, 
  ensureDirectory, 
  copyFileSafe,
  getFileStats,
  normalizePathForDisplay 
} = require('./utils/paths');

// Detect build mode: 'development' or 'production'
const isProductionBuild = () => {
  // Check for --production flag in command line arguments
  const hasProductionFlag = process.argv.includes('--production') || process.argv.includes('--prod');
  // Check NODE_ENV environment variable
  const isProdEnv = process.env.NODE_ENV === 'production';
  return hasProductionFlag || isProdEnv;
};

const BUILD_MODE = isProductionBuild() ? 'production' : 'development';

// Create ZIP archive from database file
async function createZipFromDb(dbPath, zipPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      const originalSize = fs.statSync(dbPath).size;
      const zipSize = fs.statSync(zipPath).size;
      const ratio = ((1 - zipSize / originalSize) * 100).toFixed(1);
      console.log(`📦 ZIP created: ${path.basename(zipPath)} (${zipSize} bytes, ${ratio}% smaller)`);
      resolve(zipPath);
    });

    archive.on('error', (err) => reject(err));
    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn('Archive warning:', err);
      } else {
        throw err;
      }
    });

    archive.pipe(output);
    archive.file(dbPath, { name: path.basename(dbPath) });
    archive.finalize();
  });
}

// Bible book ID mapping
const bookIdMap = {
  // Old Testament
  'genesisy': 1, 'eksodosy': 2, 'levitikosy': 3, 'nomery': 4, 'deoteronomia': 5,
  'joela': 6, 'josoa': 7, 'fitomaniana': 8, '1-jaona': 43, '2-jaona': 44, '3-jaona': 45,
  'joba': 9, 'salamo': 10, 'ohabolana': 11, 'eklesiasta': 12, 'tononkirani-solomona': 13,
  'isaia': 14, 'jeremia': 15, 'fitiomaniana': 16, 'ezekiela': 17, 'daniela': 18,
  'hosea': 19, 'joela': 20, 'amosa': 21, 'obadia': 22, 'jona': 23, 'mika': 24,
  'ahoma': 25, 'habakoka': 26, 'zefania': 27, 'hagay': 28, 'zakaria': 29, 'malakia': 30,
  'estera': 31, 'ezra': 32, 'nehemia': 33,
  // New Testament
  'matio': 40, 'marka': 41, 'lioka': 42, 'jaona': 43, 'asanny-apostoly': 44,
  'romanina': 45, '1-korintianina': 46, '2-korintianina': 47, 'galatianina': 48,
  'efesianina': 49, 'filipianina': 50, 'kolosianina': 51, '1-tesalonianina': 52,
  '2-tesalonianina': 53, '1-timoty': 54, '2-timoty': 55, 'titosy': 56, 'filemona': 57,
  'hebreo': 58, 'jakoba': 59, '1-petera': 60, '2-petera': 61, '1-jaona': 62, '2-jaona': 63,
  '3-jaona': 64, 'joda': 65, 'apokalypsy': 66
};

async function buildDatabase() {
  console.log('🚀 Building SQLite databases (dev + prod)...');
  
  // Get cross-platform paths
  const assetsPaths = getAssetsPaths();
  const databasePaths = getDatabasePaths();
  
  // Ensure all directories exist (dev and prod)
  ensureDirectory(assetsPaths.dev);
  ensureDirectory(assetsPaths.prod);
  ensureDirectory(assetsPaths.android.dev);
  ensureDirectory(assetsPaths.android.prod);
  ensureDirectory(assetsPaths.ios.dev);
  ensureDirectory(assetsPaths.ios.prod);
  
  const bibleDevPath = databasePaths.bible.dev;
  const hymnsDevPath = databasePaths.hymns.dev;
  const bibleProdPath = databasePaths.bible.prod;
  const hymnsProdPath = databasePaths.hymns.prod;

  // Clean up existing files
  const allPaths = [
    bibleDevPath, hymnsDevPath,
    bibleProdPath, hymnsProdPath,
    databasePaths.bible.androidDev, databasePaths.hymns.androidDev,
    databasePaths.bible.androidProd, databasePaths.hymns.androidProd,
    databasePaths.bible.iosDev, databasePaths.hymns.iosDev,
    databasePaths.bible.iosProd, databasePaths.hymns.iosProd,
  ];
  
  for (const p of allPaths) {
    if (fs.existsSync(p)) {
      fs.unlinkSync(p);
    }
  }

  // Build databases in dev directory
  await buildBibleMG65Database(bibleDevPath);
  await buildHymnsDatabase(hymnsDevPath);

  console.log('📦 Copying to platform assets...');
  
  // Copy .db files to dev directories
  copyFileSafe(bibleDevPath, databasePaths.bible.androidDev);
  copyFileSafe(hymnsDevPath, databasePaths.hymns.androidDev);
  copyFileSafe(bibleDevPath, databasePaths.bible.iosDev);
  copyFileSafe(hymnsDevPath, databasePaths.hymns.iosDev);

  // Create ZIP archives for production
  console.log('🗜️ Creating ZIP archives for production...');
  await createZipFromDb(bibleDevPath, bibleProdPath);
  await createZipFromDb(hymnsDevPath, hymnsProdPath);
  
  // Copy ZIP files to prod directories
  copyFileSafe(bibleProdPath, databasePaths.bible.androidProd);
  copyFileSafe(hymnsProdPath, databasePaths.hymns.androidProd);
  copyFileSafe(bibleProdPath, databasePaths.bible.iosProd);
  copyFileSafe(hymnsProdPath, databasePaths.hymns.iosProd);

  console.log('✅ Database build completed! (dev + prod)');
  return { 
    bibleDevPath, hymnsDevPath,
    bibleProdPath, hymnsProdPath
  };
}

function normalizeVerseText(text) {
  if (typeof text !== 'string') {
    return '';
  }

  return text
    .replace(/[\u2019\u2018\u02BC]/g, "'")
    .replace(/<[^>]*>/g, ' ')
    .replace(/\[\/\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeHymnAuthors(authors) {
  if (typeof authors !== 'string' || authors.length === 0) {
    return '';
  }

  try {
    const parsed = JSON.parse(authors);
    if (Array.isArray(parsed)) {
      return parsed.join(' ');
    }
  } catch {
    // ignore
  }

  return authors;
}

function buildBibleMG65Database(dbPath) {
  const databasePaths = getDatabasePaths();
  const mg65JsonPath = databasePaths.bible.source;
  
  if (!fs.existsSync(mg65JsonPath)) {
    throw new Error(`MG65 JSON not found at: ${normalizePathForDisplay(mg65JsonPath)}`);
  }

  console.log('📖 Building Bible MG65 database (FTS5-enabled)...');
  const mg65 = JSON.parse(fs.readFileSync(mg65JsonPath, 'utf8'));
  const tables = (mg65.objects || []).filter(o => o.type === 'table');
  const booksTable = tables.find(t => t.name === 'books');
  const versesTable = tables.find(t => t.name === 'verses');

  if (!booksTable || !versesTable) {
    throw new Error('MG65 JSON missing required tables (books, verses)');
  }

  const bookCols = (booksTable.columns || []).map(c => c.name);
  const verseCols = (versesTable.columns || []).map(c => c.name);
  const bBookNum = bookCols.indexOf('book_number');
  const bLong = bookCols.indexOf('long_name');
  const bShort = bookCols.indexOf('short_name');
  const vBook = verseCols.indexOf('book_number');
  const vChapter = verseCols.indexOf('chapter');
  const vVerse = verseCols.indexOf('verse');
  const vText = verseCols.indexOf('text');

  if ([bBookNum, bLong, bShort, vBook, vChapter, vVerse, vText].some(i => i < 0)) {
    throw new Error('MG65 JSON schema is missing expected columns');
  }

  const mg65Books = (booksTable.rows || []).map(r => ({
    bookNumber: Number(r[bBookNum]),
    shortName: String(r[bShort] || ''),
    longName: String(r[bLong] || ''),
  }));

  const mg65BookNumbersSorted = [...new Set(mg65Books.map(b => b.bookNumber))].sort((a, b) => a - b);
  const bookNumberToId = new Map(mg65BookNumbersSorted.map((bn, idx) => [bn, idx + 1]));
  const oldTestamentThreshold = 400;

  const crossRefsPath = databasePaths.bible.crossReferences;

  const osisBookToCanonical = {
    Gen: 1,
    Exod: 2,
    Lev: 3,
    Num: 4,
    Deut: 5,
    Josh: 6,
    Judg: 7,
    Ruth: 8,
    '1Sam': 9,
    '2Sam': 10,
    '1Kgs': 11,
    '2Kgs': 12,
    '1Chr': 13,
    '2Chr': 14,
    Ezra: 15,
    Neh: 16,
    Esth: 17,
    Job: 18,
    Ps: 19,
    Prov: 20,
    Eccl: 21,
    Song: 22,
    Isa: 23,
    Jer: 24,
    Lam: 25,
    Ezek: 26,
    Dan: 27,
    Hos: 28,
    Joel: 29,
    Amos: 30,
    Obad: 31,
    Jonah: 32,
    Mic: 33,
    Nah: 34,
    Hab: 35,
    Zeph: 36,
    Hag: 37,
    Zech: 38,
    Mal: 39,
    Matt: 40,
    Mark: 41,
    Luke: 42,
    John: 43,
    Acts: 44,
    Rom: 45,
    '1Cor': 46,
    '2Cor': 47,
    Gal: 48,
    Eph: 49,
    Phil: 50,
    Col: 51,
    '1Thess': 52,
    '2Thess': 53,
    '1Tim': 54,
    '2Tim': 55,
    Titus: 56,
    Phlm: 57,
    Heb: 58,
    Jas: 59,
    '1Pet': 60,
    '2Pet': 61,
    '1John': 62,
    '2John': 63,
    '3John': 64,
    Jude: 65,
    Rev: 66,
  };

  const parseOsisSingleRef = (ref) => {
    if (typeof ref !== 'string') {
      return null;
    }

    const trimmed = ref.trim();
    if (!trimmed) {
      return null;
    }

    const firstDot = trimmed.indexOf('.');
    const secondDot = firstDot >= 0 ? trimmed.indexOf('.', firstDot + 1) : -1;
    if (firstDot < 0 || secondDot < 0) {
      return null;
    }

    const book = trimmed.slice(0, firstDot);
    const chapterStr = trimmed.slice(firstDot + 1, secondDot);
    const verseStr = trimmed.slice(secondDot + 1);
    const canonicalBook = osisBookToCanonical[book];
    const chapter = Number(chapterStr);
    const verse = Number(verseStr);

    if (!canonicalBook || !Number.isFinite(chapter) || !Number.isFinite(verse)) {
      return null;
    }

    return { canonicalBook, chapter, verse };
  };

  const parseOsisRefOrRange = (value) => {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const parts = trimmed.split('-');
    const start = parseOsisSingleRef(parts[0]);
    if (!start) {
      return null;
    }

    if (parts.length === 1) {
      return {
        canonicalBook: start.canonicalBook,
        chapter: start.chapter,
        verseStart: start.verse,
        verseEnd: start.verse,
      };
    }

    const end = parseOsisSingleRef(parts[1]);
    if (!end) {
      return null;
    }

    if (end.canonicalBook !== start.canonicalBook || end.chapter !== start.chapter) {
      return null;
    }

    return {
      canonicalBook: start.canonicalBook,
      chapter: start.chapter,
      verseStart: start.verse,
      verseEnd: end.verse,
    };
  };

  const importCrossReferences = async () => {
    if (!fs.existsSync(crossRefsPath)) {
      console.log('⚠️ cross_references.txt not found, skipping cross-reference import');
      return;
    }

    console.log('🔗 Importing cross references...');

    await run(`CREATE TABLE IF NOT EXISTS BookCanonicalMap (
      canonical_book INTEGER PRIMARY KEY,
      book_id INTEGER NOT NULL UNIQUE,
      FOREIGN KEY (book_id) REFERENCES Books (id) ON DELETE CASCADE
    )`);

    await run(`CREATE TABLE IF NOT EXISTS CrossReferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_book INTEGER NOT NULL,
      from_chapter INTEGER NOT NULL,
      from_verse INTEGER NOT NULL,
      to_book INTEGER NOT NULL,
      to_chapter INTEGER NOT NULL,
      to_verse_start INTEGER NOT NULL,
      to_verse_end INTEGER NOT NULL,
      votes INTEGER NOT NULL DEFAULT 0
    )`);

    await run(`CREATE INDEX IF NOT EXISTS idx_crossrefs_from ON CrossReferences(from_book, from_chapter, from_verse)`);

    const canonicalMapStmt = db.prepare(
      `INSERT OR REPLACE INTO BookCanonicalMap (canonical_book, book_id) VALUES (?, ?)`
    );
    const insertCanonicalMapAsync = (params) =>
      new Promise((resolve2, reject2) => {
        canonicalMapStmt.run(params, err => (err ? reject2(err) : resolve2()));
      });

    for (let canonical = 1; canonical <= mg65BookNumbersSorted.length; canonical += 1) {
      const bn = mg65BookNumbersSorted[canonical - 1];
      const internalId = bookNumberToId.get(bn);
      if (internalId) {
        await insertCanonicalMapAsync([canonical, internalId]);
      }
    }
    await new Promise((resolve2, reject2) => canonicalMapStmt.finalize(err => (err ? reject2(err) : resolve2())));

    const crossRefStmt = db.prepare(
      `INSERT INTO CrossReferences (
        from_book, from_chapter, from_verse,
        to_book, to_chapter, to_verse_start, to_verse_end,
        votes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const insertCrossRefAsync = (params) =>
      new Promise((resolve2, reject2) => {
        crossRefStmt.run(params, err => (err ? reject2(err) : resolve2()));
      });

    return new Promise((resolve, reject) => {
      const fileStream = fs.createReadStream(crossRefsPath, { encoding: 'utf8' });
      const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

      let lineNumber = 0;
      let inserted = 0;
      let skipped = 0;
      let invalidFormat = 0;
      let invalidRefs = 0;
      let invalidVotes = 0;
      const lines = [];

      rl.on('line', (line) => {
        lines.push(line);
      });

      rl.on('close', async () => {
        try {
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            lineNumber = i + 1;
            
            if (lineNumber === 1) {
              continue;
            }

            const trimmed = String(line || '').trim();
            if (!trimmed) {
              continue;
            }

            const cols = trimmed.split('\t');
            if (cols.length < 3) {
              skipped += 1;
              invalidFormat += 1;
              if (invalidFormat <= 5) {
                console.warn(`  ⚠️ Invalid format at line ${lineNumber}: ${trimmed.substring(0, 50)}...`);
              }
              continue;
            }

            const fromParsed = parseOsisSingleRef(cols[0]);
            const toParsed = parseOsisRefOrRange(cols[1]);
            const votes = Number(cols[2]);

            if (!fromParsed || !toParsed) {
              skipped += 1;
              invalidRefs += 1;
              if (invalidRefs <= 5) {
                console.warn(`  ⚠️ Invalid reference at line ${lineNumber}: From="${cols[0]}" To="${cols[1]}"`);
              }
              continue;
            }

            if (!Number.isFinite(votes)) {
              skipped += 1;
              invalidVotes += 1;
              if (invalidVotes <= 5) {
                console.warn(`  ⚠️ Invalid votes at line ${lineNumber}: "${cols[2]}"`);
              }
              continue;
            }

            await insertCrossRefAsync([
              fromParsed.canonicalBook,
              fromParsed.chapter,
              fromParsed.verse,
              toParsed.canonicalBook,
              toParsed.chapter,
              toParsed.verseStart,
              toParsed.verseEnd,
              Math.trunc(votes),
            ]);
            inserted += 1;

            if (inserted % 50000 === 0) {
              console.log(`  ↳ cross refs inserted: ${inserted} (skipped: ${skipped})`);
            }
          }

          await new Promise((resolve2, reject2) => crossRefStmt.finalize(err => (err ? reject2(err) : resolve2())));
          console.log(`✅ Cross references imported: ${inserted} rows (skipped: ${skipped})`);
          if (skipped > 0) {
            console.log(`📊 Skip breakdown: ${invalidFormat} invalid format, ${invalidRefs} invalid refs, ${invalidVotes} invalid votes`);
          }
          resolve();
        } catch (error) {
          reject(error);
        }
      });

      rl.on('error', reject);
    });
  };

  const maxChapterByBookNumber = new Map();
  for (const r of (versesTable.rows || [])) {
    const bn = Number(r[vBook]);
    const ch = Number(r[vChapter]);
    const cur = maxChapterByBookNumber.get(bn) || 0;
    if (ch > cur) {
      maxChapterByBookNumber.set(bn, ch);
    }
  }

  const db = new sqlite3.Database(dbPath);
  const run = (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.run(sql, params, err => (err ? reject(err) : resolve()));
    });

  return new Promise((resolve, reject) => {
    db.serialize(async () => {
      try {
        console.log('📝 Creating Bible schema...');

        await run(`PRAGMA journal_mode = WAL`);
        await run(`PRAGMA synchronous = NORMAL`);
        await run(`PRAGMA temp_store = MEMORY`);

        await run(`CREATE TABLE Books (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          testament TEXT NOT NULL CHECK (testament IN ('old', 'new')),
          chapters INTEGER NOT NULL,
          filename TEXT NOT NULL
        )`);

        await run(`CREATE TABLE Verses (
          id INTEGER PRIMARY KEY,
          book_id INTEGER NOT NULL,
          chapter INTEGER NOT NULL,
          verse_number INTEGER NOT NULL,
          text TEXT NOT NULL,
          FOREIGN KEY (book_id) REFERENCES Books (id) ON DELETE CASCADE,
          UNIQUE(book_id, chapter, verse_number) ON CONFLICT REPLACE
        )`);

        await run(`CREATE INDEX idx_verses_book ON Verses(book_id, chapter, verse_number)`);

        await run(`CREATE VIRTUAL TABLE VersesFts USING fts5(
          text_plain,
          tokenize='unicode61 remove_diacritics 2',
          prefix='2 3 4',
          content=''
        )`);

        console.log('📚 Importing books...');
        for (const b of mg65Books) {
          const id = bookNumberToId.get(b.bookNumber);
          if (!id) {
            throw new Error(`Missing book id mapping for book_number=${b.bookNumber}`);
          }
          const testament = b.bookNumber < oldTestamentThreshold ? 'old' : 'new';
          const chapters = maxChapterByBookNumber.get(b.bookNumber) || 0;
          const filename = '';
          await run(
            `INSERT OR REPLACE INTO Books (id, name, testament, chapters, filename) VALUES (?, ?, ?, ?, ?)`,
            [id, b.longName, testament, chapters, filename]
          );
        }

        console.log('📄 Importing verses (normalized) ...');
        let verseId = 1;
        const insertVerseSql =
          `INSERT OR REPLACE INTO Verses (id, book_id, chapter, verse_number, text) VALUES (?, ?, ?, ?, ?)`;
        const insertFtsSql =
          `INSERT INTO VersesFts(rowid, text_plain) VALUES (?, ?)`;
        const versesStmt = db.prepare(insertVerseSql);
        const ftsStmt = db.prepare(insertFtsSql);
        const insertVerseAsync = (params) =>
          new Promise((resolve2, reject2) => {
            versesStmt.run(params, err => (err ? reject2(err) : resolve2()));
          });
        const insertFtsAsync = (params) =>
          new Promise((resolve2, reject2) => {
            ftsStmt.run(params, err => (err ? reject2(err) : resolve2()));
          });

        for (const r of (versesTable.rows || [])) {
          const bn = Number(r[vBook]);
          const id = bookNumberToId.get(bn);
          if (!id) {
            throw new Error(`Unknown book_number in verses: ${bn}`);
          }
          const chapter = Number(r[vChapter]);
          const verseNumber = Number(r[vVerse]);
          const text = String(r[vText] || '');
          const textPlain = normalizeVerseText(text);
          const rowId = verseId;
          verseId += 1;
          await insertVerseAsync([rowId, id, chapter, verseNumber, text]);
          await insertFtsAsync([rowId, textPlain]);
        }

        await importCrossReferences();

        await new Promise((resolve2, reject2) => versesStmt.finalize(err => (err ? reject2(err) : resolve2())));
        await new Promise((resolve2, reject2) => ftsStmt.finalize(err => (err ? reject2(err) : resolve2())));

        console.log('🧹 Optimizing...');
        await run(`INSERT INTO VersesFts(VersesFts) VALUES('optimize')`);
        await run(`ANALYZE`);
        await run(`VACUUM`);

        db.close(err => {
          if (err) {
            console.error('Error closing Bible database:', err);
            reject(err);
          } else {
            console.log('✅ Bible MG65 DB built:', dbPath);
            resolve(dbPath);
          }
        });
      } catch (error) {
        console.error('Error building Bible MG65 database:', error);
        db.close(() => reject(error));
      }
    });
  });
}

function buildHymnsDatabase(dbPath) {
  console.log('🎵 Building Hymns database...');
  const db = new sqlite3.Database(dbPath);
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      console.log('📝 Creating hymns schema...');

      db.run(`CREATE TABLE Hymns (
        id TEXT PRIMARY KEY,
        number INTEGER NOT NULL,
        category TEXT,
        title TEXT,
        authors TEXT
      )`);

      db.run(`CREATE TABLE HymnVerses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hymn_id TEXT NOT NULL,
        verse_number INTEGER NOT NULL,
        text TEXT NOT NULL,
        is_chorus BOOLEAN NOT NULL DEFAULT 0,
        FOREIGN KEY (hymn_id) REFERENCES Hymns (id) ON DELETE CASCADE,
        UNIQUE(hymn_id, verse_number) ON CONFLICT REPLACE
      )`);

      db.run(`CREATE INDEX idx_hymns_number_category ON Hymns(number, category)`);
      db.run(`CREATE INDEX idx_hymn_verses ON HymnVerses(hymn_id, verse_number)`);

      db.run(`CREATE VIRTUAL TABLE HymnsFts USING fts5(
        title_plain,
        authors_plain,
        hymn_id UNINDEXED,
        number UNINDEXED,
        category UNINDEXED,
        tokenize='unicode61 remove_diacritics 2',
        prefix='2 3 4'
      )`);

      db.run(`CREATE VIRTUAL TABLE HymnVersesFts USING fts5(
        text_plain,
        hymn_id UNINDEXED,
        verse_number UNINDEXED,
        tokenize='unicode61 remove_diacritics 2',
        prefix='2 3 4'
      )`);

      console.log('🎶 Importing hymns data...');
      importHymnsData(db);

      console.log('🔎 Populating hymns FTS index...');
      db.all(`SELECT rowid, id, number, category, title, authors FROM Hymns`, [], (err, hymnRows) => {
        if (err) {
          console.error('Error reading Hymns for FTS:', err);
          db.close(() => reject(err));
          return;
        }

        const hymnsStmt = db.prepare(
          `INSERT INTO HymnsFts(rowid, title_plain, authors_plain, hymn_id, number, category) VALUES (?, ?, ?, ?, ?, ?)`
        );

        for (const h of hymnRows) {
          const titlePlain = normalizeVerseText(String(h.title || ''));
          const authorsPlain = normalizeVerseText(normalizeHymnAuthors(String(h.authors || '')));
          hymnsStmt.run([
            h.rowid,
            titlePlain,
            authorsPlain,
            h.id,
            Number(h.number) || 0,
            String(h.category || ''),
          ]);
        }

        hymnsStmt.finalize((err2) => {
          if (err2) {
            console.error('Error writing HymnsFts:', err2);
            db.close(() => reject(err2));
            return;
          }

          console.log('🔎 Populating hymn verses FTS index...');
          db.all(`SELECT id, hymn_id, verse_number, text FROM HymnVerses`, [], (err3, verseRows) => {
            if (err3) {
              console.error('Error reading HymnVerses for FTS:', err3);
              db.close(() => reject(err3));
              return;
            }

            const versesStmt = db.prepare(
              `INSERT INTO HymnVersesFts(rowid, text_plain, hymn_id, verse_number) VALUES (?, ?, ?, ?)`
            );

            for (const r of verseRows) {
              versesStmt.run([
                r.id,
                normalizeVerseText(String(r.text || '')),
                r.hymn_id,
                Number(r.verse_number) || 0,
              ]);
            }

            versesStmt.finalize((err4) => {
              if (err4) {
                console.error('Error writing HymnVersesFts:', err4);
                db.close(() => reject(err4));
                return;
              }

              db.run(`INSERT INTO HymnsFts(HymnsFts) VALUES('optimize')`);
              db.run(`INSERT INTO HymnVersesFts(HymnVersesFts) VALUES('optimize')`);
              db.run(`ANALYZE`, [], (err5) => {
                if (err5) {
                  console.error('Error during ANALYZE:', err5);
                  db.close(() => reject(err5));
                  return;
                }

                db.close((err6) => {
                  if (err6) {
                    console.error('Error closing hymns database:', err6);
                    reject(err6);
                  } else {
                    console.log('✅ Hymns DB built:', dbPath);
                    resolve(dbPath);
                  }
                });
              });
            });
          });
        });
      });
    });
  });
}

function importHymnsData(db) {
  const databasePaths = getDatabasePaths();
  const hymnsPath = databasePaths.hymns.source;
  const files = ['01_fihirana_ffpm.json', '02_fihirana_fanampiny.json', '03_antema.json'];
  
  files.forEach(file => {
    const filePath = path.join(hymnsPath, file);
    if (fs.existsSync(filePath)) {
      console.log(`🎼 Importing hymns from: ${file}`);
      
      const hymnsData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      Object.entries(hymnsData).forEach(([hymnId, hymnData]) => {
        // Insert hymn
        db.run(`INSERT OR REPLACE INTO Hymns (id, number, category, title, authors) VALUES (?, ?, ?, ?, ?)`,
          [
            hymnId,
            parseInt(hymnData.laharana) || 0,
            hymnData.sokajy || '',
            hymnData.lohateny || '',
            hymnData.mpanoratra.length > 0 ? JSON.stringify(hymnData.mpanoratra) : null
          ]);
        
        // Insert verses
        hymnData.hira.forEach(verse => {
          db.run(`INSERT OR REPLACE INTO HymnVerses (hymn_id, verse_number, text, is_chorus) VALUES (?, ?, ?, ?)`,
            [hymnId, verse.andininy, verse.tononkira, verse.fiverenany ? 1 : 0]);
        });
      });
    }
  });
}

function computeSha256(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

function verifyDatabaseFiles() {
  console.log('🔍 Verifying database files (dev + prod)...');

  const databasePaths = getDatabasePaths();
  const files = [
    {
      name: 'BibleMG65.db (dev)',
      paths: [
        databasePaths.bible.dev,
        databasePaths.bible.androidDev,
        databasePaths.bible.iosDev,
      ],
    },
    {
      name: 'Hymns.db (dev)',
      paths: [
        databasePaths.hymns.dev,
        databasePaths.hymns.androidDev,
        databasePaths.hymns.iosDev,
      ],
    },
    {
      name: 'BibleMG65.zip (prod)',
      paths: [
        databasePaths.bible.prod,
        databasePaths.bible.androidProd,
        databasePaths.bible.iosProd,
      ],
    },
    {
      name: 'Hymns.zip (prod)',
      paths: [
        databasePaths.hymns.prod,
        databasePaths.hymns.androidProd,
        databasePaths.hymns.iosProd,
      ],
    },
  ];

  for (const group of files) {
    const missing = group.paths.filter(p => !fs.existsSync(p));
    if (missing.length > 0) {
      throw new Error(`Missing database files for ${group.name}: ${missing.map(p => normalizePathForDisplay(p)).join(', ')}`);
    }

    const stats = group.paths.map(p => {
      const fileStats = getFileStats(p);
      return {
        file: normalizePathForDisplay(p),
        size: fileStats ? fileStats.size : 0,
        hash: fileStats ? computeSha256(p) : '',
      };
    });

    const [reference] = stats;
    const mismatched = stats.filter(
      entry => entry.size !== reference.size || entry.hash !== reference.hash
    );

    if (mismatched.length > 0) {
      mismatched.forEach(entry => {
        console.error(`❌ Mismatch (${group.name}): ${entry.file} (${entry.size} bytes, ${entry.hash})`);
      });
      throw new Error(`Database verification failed for ${group.name}: file mismatch detected.`);
    }

    console.log(`✅ ${group.name} verification passed (${reference.size} bytes, sha256 ${reference.hash.slice(0, 16)}...)`);
  }
}

// Run the build
buildDatabase()
  .then(({ bibleDevPath, hymnsDevPath, bibleProdPath, hymnsProdPath }) => {
    console.log(`✅ Bible DB (dev): ${bibleDevPath}`);
    console.log(`✅ Hymns DB (dev): ${hymnsDevPath}`);
    console.log(`✅ Bible ZIP (prod): ${bibleProdPath}`);
    console.log(`✅ Hymns ZIP (prod): ${hymnsProdPath}`);
    verifyDatabaseFiles();
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error building database:', error);
    process.exit(1);
  });
