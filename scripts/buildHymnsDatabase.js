// scripts/buildHymnsDatabase.js
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const { 
  getAssetsPaths, 
  getSourceDataPaths, 
  getDatabasePaths, 
  ensureDirectory, 
  copyFileSafe,
  getFileStats,
  normalizePathForDisplay 
} = require('./utils/paths');

function buildHymnsDatabase() {
  console.log('🎵 Building Hymns SQLite database from JSON files...');
  
  // Get cross-platform paths
  const assetsPaths = getAssetsPaths();
  const databasePaths = getDatabasePaths();
  
  // Ensure all directories exist
  ensureDirectory(assetsPaths.root);
  ensureDirectory(assetsPaths.android);
  ensureDirectory(assetsPaths.ios);
  
  const hymnsDbPath = databasePaths.hymns.root;

  // Clean up existing database if it exists
  if (fs.existsSync(hymnsDbPath)) {
    console.log('🗑️  Removing existing hymns database...');
    fs.unlinkSync(hymnsDbPath);
  }

  console.log(`📁 Building hymns database at: ${normalizePathForDisplay(hymnsDbPath)}`);
  
  const db = new sqlite3.Database(hymnsDbPath);
  
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
          console.error('Error fetching hymns for FTS:', err);
          reject(err);
          return;
        }

        hymnRows.forEach(hymn => {
          const titlePlain = hymn.title.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
          const authorsPlain = (hymn.authors || '').toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
          
          db.run(`INSERT INTO HymnsFts (rowid, title_plain, authors_plain, hymn_id, number, category) VALUES (?, ?, ?, ?, ?, ?)`,
            [hymn.rowid, titlePlain, authorsPlain, hymn.id, hymn.number, hymn.category || '']);
        });
      });

      db.all(`SELECT rowid, hymn_id, verse_number, text FROM HymnVerses`, [], (err, verseRows) => {
        if (err) {
          console.error('Error fetching hymn verses for FTS:', err);
          reject(err);
          return;
        }

        verseRows.forEach(verse => {
          const textPlain = verse.text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
          
          db.run(`INSERT INTO HymnVersesFts (rowid, text_plain, hymn_id, verse_number) VALUES (?, ?, ?, ?)`,
            [verse.rowid, textPlain, verse.hymn_id, verse.verse_number]);
        });

        console.log('✅ Hymns database built successfully!');
        resolve();
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

function copyHymnsDatabaseToAssets() {
  console.log('📦 Copying hymns database to platform assets...');
  
  const assetsPaths = getAssetsPaths();
  const databasePaths = getDatabasePaths();
  
  const sourceDb = databasePaths.hymns.root;
  const androidTarget = assetsPaths.android;
  const iosTarget = assetsPaths.ios;
  
  // Copy to Android assets
  copyFileSafe(sourceDb, path.join(androidTarget, 'Hymns.db'));
  
  // Copy to iOS bundle
  copyFileSafe(sourceDb, path.join(iosTarget, 'Hymns.db'));
  
  console.log('✅ Hymns database copied to platform assets!');
}

// Main execution
if (require.main === module) {
  buildHymnsDatabase()
    .then(() => {
      copyHymnsDatabaseToAssets();
      console.log('🎉 Hymns database build completed successfully!');
    })
    .catch(error => {
      console.error('❌ Error building hymns database:', error);
      process.exit(1);
    });
}

module.exports = { buildHymnsDatabase, copyHymnsDatabaseToAssets };
