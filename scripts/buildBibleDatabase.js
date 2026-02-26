// scripts/buildBibleDatabase.js
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');
const { 
  getAssetsPaths, 
  getSourceDataPaths, 
  getDatabasePaths, 
  ensureDirectory, 
  copyFileSafe,
  getFileStats,
  normalizePathForDisplay 
} = require('./utils/paths');

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

function buildBibleDatabase() {
  console.log('🚀 Building Bible SQLite database from JSON files...');
  
  // Get cross-platform paths
  const assetsPaths = getAssetsPaths();
  const databasePaths = getDatabasePaths();
  
  // Ensure all directories exist
  ensureDirectory(assetsPaths.root);
  ensureDirectory(assetsPaths.android);
  ensureDirectory(assetsPaths.ios);
  
  const bibleDbPath = databasePaths.bible.root;

  // Clean up existing database if it exists
  if (fs.existsSync(bibleDbPath)) {
    console.log('🗑️  Removing existing Bible database...');
    fs.unlinkSync(bibleDbPath);
  }

  console.log(`📁 Building Bible database at: ${normalizePathForDisplay(bibleDbPath)}`);
  
  const db = new sqlite3.Database(bibleDbPath);
  
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      console.log('📝 Creating Bible schema...');

      db.run(`CREATE TABLE Books (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        testament TEXT NOT NULL,
        chapters INTEGER NOT NULL,
        filename TEXT NOT NULL
      )`);

      db.run(`CREATE TABLE Verses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER NOT NULL,
        chapter INTEGER NOT NULL,
        verse_number INTEGER NOT NULL,
        text TEXT NOT NULL,
        FOREIGN KEY (book_id) REFERENCES Books (id) ON DELETE CASCADE,
        UNIQUE(book_id, chapter, verse_number) ON CONFLICT REPLACE
      )`);

      db.run(`CREATE TABLE CrossReferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_book_id INTEGER NOT NULL,
        from_chapter INTEGER NOT NULL,
        from_verse_start INTEGER NOT NULL,
        from_verse_end INTEGER NOT NULL,
        to_book_id INTEGER NOT NULL,
        to_book_name TEXT NOT NULL,
        to_chapter INTEGER NOT NULL,
        to_verse_start INTEGER NOT NULL,
        to_verse_end INTEGER NOT NULL,
        votes INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (from_book_id) REFERENCES Books (id) ON DELETE CASCADE,
        FOREIGN KEY (to_book_id) REFERENCES Books (id) ON DELETE CASCADE
      )`);

      db.run(`CREATE INDEX idx_verses_book_chapter ON Verses(book_id, chapter)`);
      db.run(`CREATE INDEX idx_cross_refs_from ON CrossReferences(from_book_id, from_chapter, from_verse_start, from_verse_end)`);
      db.run(`CREATE INDEX idx_cross_refs_to ON CrossReferences(to_book_id, to_chapter, to_verse_start, to_verse_end)`);

      db.run(`CREATE VIRTUAL TABLE BooksFts USING fts5(
        name_plain,
        testament UNINDEXED,
        chapters UNINDEXED,
        rowid UNINDEXED,
        tokenize='unicode61 remove_diacritics 2',
        prefix='2 3 4'
      )`);

      db.run(`CREATE VIRTUAL TABLE VersesFts USING fts5(
        text_plain,
        book_id UNINDEXED,
        chapter UNINDEXED,
        verse_number UNINDEXED,
        rowid UNINDEXED,
        tokenize='unicode61 remove_diacritics 2',
        prefix='2 3 4'
      )`);

      console.log('📚 Importing Bible books...');
      importBibleBooks(db);

      console.log('📖 Importing Bible verses...');
      importBibleVerses(db);

      console.log('🔗 Importing cross references...');
      importCrossReferences(db);

      console.log('🔎 Populating Bible FTS index...');
      db.all(`SELECT rowid, id, name, testament, chapters FROM Books`, [], (err, bookRows) => {
        if (err) {
          console.error('Error fetching books for FTS:', err);
          reject(err);
          return;
        }

        bookRows.forEach(book => {
          const namePlain = book.name.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
          
          db.run(`INSERT INTO BooksFts (rowid, name_plain, testament, chapters) VALUES (?, ?, ?, ?)`,
            [book.rowid, namePlain, book.testament, book.chapters]);
        });
      });

      db.all(`SELECT rowid, book_id, chapter, verse_number, text FROM Verses`, [], (err, verseRows) => {
        if (err) {
          console.error('Error fetching verses for FTS:', err);
          reject(err);
          return;
        }

        verseRows.forEach(verse => {
          const textPlain = verse.text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
          
          db.run(`INSERT INTO VersesFts (rowid, text_plain, book_id, chapter, verse_number) VALUES (?, ?, ?, ?, ?)`,
            [verse.rowid, textPlain, verse.book_id, verse.chapter, verse.verse_number]);
        });

        console.log('✅ Bible database built successfully!');
        resolve();
      });
    });
  });
}

function importBibleBooks(db) {
  const databasePaths = getDatabasePaths();
  const biblePath = databasePaths.bible.source;
  const booksFile = path.join(biblePath, 'books.json');
  
  if (!fs.existsSync(booksFile)) {
    console.error(`❌ Books file not found: ${booksFile}`);
    return;
  }

  const booksData = JSON.parse(fs.readFileSync(booksFile, 'utf8'));
  
  Object.entries(booksData).forEach(([filename, bookData]) => {
    const bookName = bookData.name;
    const bookId = bookIdMap[filename.toLowerCase()];
    
    if (bookId) {
      db.run(`INSERT OR REPLACE INTO Books (id, name, testament, chapters, filename) VALUES (?, ?, ?, ?, ?)`,
        [bookId, bookName, bookData.testament, bookData.chapters, filename]);
    } else {
      console.warn(`⚠️  Unknown book filename: ${filename}`);
    }
  });
}

function importBibleVerses(db) {
  const databasePaths = getDatabasePaths();
  const biblePath = databasePaths.bible.source;
  const booksFile = path.join(biblePath, 'books.json');
  
  if (!fs.existsSync(booksFile)) {
    console.error(`❌ Books file not found: ${booksFile}`);
    return;
  }

  const booksData = JSON.parse(fs.readFileSync(booksFile, 'utf8'));
  
  Object.entries(booksData).forEach(([filename, bookData]) => {
    const bookId = bookIdMap[filename.toLowerCase()];
    
    if (bookId) {
      const versesFile = path.join(biblePath, filename);
      
      if (fs.existsSync(versesFile)) {
        console.log(`📖 Importing verses from: ${filename}`);
        
        const versesData = JSON.parse(fs.readFileSync(versesFile, 'utf8'));
        
        Object.entries(versesData).forEach(([chapterStr, verses]) => {
          const chapter = parseInt(chapterStr);
          
          Object.entries(verses).forEach(([verseStr, text]) => {
            const verseNumber = parseInt(verseStr);
            
            db.run(`INSERT OR REPLACE INTO Verses (book_id, chapter, verse_number, text) VALUES (?, ?, ?, ?)`,
              [bookId, chapter, verseNumber, text]);
          });
        });
      } else {
        console.warn(`⚠️  Verses file not found: ${versesFile}`);
      }
    }
  });
}

function importCrossReferences(db) {
  const databasePaths = getDatabasePaths();
  const biblePath = databasePaths.bible.source;
  const crossRefsFile = path.join(biblePath, 'cross_references.txt');
  
  if (!fs.existsSync(crossRefsFile)) {
    console.warn(`⚠️  Cross references file not found: ${crossRefsFile}`);
    return;
  }

  console.log(`🔗 Importing cross references from: ${crossRefsFile}`);
  
  const fileStream = fs.createReadStream(crossRefsFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let importedCount = 0;
  let skippedCount = 0;

  rl.on('line', (line) => {
    const parts = line.split('\t');
    if (parts.length >= 9) {
      const fromBookId = parseInt(parts[0]);
      const fromChapter = parseInt(parts[1]);
      const fromVerseStart = parseInt(parts[2]);
      const fromVerseEnd = parseInt(parts[3]);
      const toBookId = parseInt(parts[4]);
      const toBookName = parts[5];
      const toChapter = parseInt(parts[6]);
      const toVerseStart = parseInt(parts[7]);
      const toVerseEnd = parseInt(parts[8]);
      const votes = parseInt(parts[9]) || 0;

      // Validate book IDs
      if (bookIdMap[Object.keys(bookIdMap).find(key => bookIdMap[key] === fromBookId)] && 
          bookIdMap[Object.keys(bookIdMap).find(key => bookIdMap[key] === toBookId)]) {
        db.run(`INSERT OR REPLACE INTO CrossReferences (
          from_book_id, from_chapter, from_verse_start, from_verse_end,
          to_book_id, to_book_name, to_chapter, to_verse_start, to_verse_end, votes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [fromBookId, fromChapter, fromVerseStart, fromVerseEnd,
           toBookId, toBookName, toChapter, toVerseStart, toVerseEnd, votes]);
        importedCount++;
      } else {
        skippedCount++;
      }
    }
  });

  return new Promise((resolve) => {
    rl.on('close', () => {
      console.log(`✅ Imported ${importedCount} cross references, skipped ${skippedCount} invalid entries`);
      resolve();
    });
  });
}

function copyBibleDatabaseToAssets() {
  console.log('📦 Copying Bible database to platform assets...');
  
  const assetsPaths = getAssetsPaths();
  const databasePaths = getDatabasePaths();
  
  const sourceDb = databasePaths.bible.root;
  const androidTarget = assetsPaths.android;
  const iosTarget = assetsPaths.ios;
  
  // Copy to Android assets
  copyFileSafe(sourceDb, path.join(androidTarget, 'BibleMG65.db'));
  
  // Copy to iOS bundle
  copyFileSafe(sourceDb, path.join(iosTarget, 'BibleMG65.db'));
  
  console.log('✅ Bible database copied to platform assets!');
}

// Main execution
if (require.main === module) {
  buildBibleDatabase()
    .then(() => {
      copyBibleDatabaseToAssets();
      console.log('🎉 Bible database build completed successfully!');
    })
    .catch(error => {
      console.error('❌ Error building Bible database:', error);
      process.exit(1);
    });
}

module.exports = { buildBibleDatabase, copyBibleDatabaseToAssets };
