// scripts/utils/buildDb.js
//
// Shared helpers for the Bible and Hymns DB builders. Single source of truth
// for normalization, FTS5 schema, optimization, ZIP creation, and size audit.
//
// CRITICAL: NEVER use \w in the FTS plain-text normalization. \w drops accented
// letters (ô, â, ...) and would break diacritic-insensitive search.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();
const archiver = require('archiver');

const {
  getFileStats,
  normalizePathForDisplay,
} = require('./paths');

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

function cleanDisplayText(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/[\u2019\u2018\u02BC]/g, "'")
    .replace(/<[^>]*>/g, ' ')
    .replace(/\[\/\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Used ONLY for the FTS `*_plain` columns. Mirrors runtime query normalization
// in src/hooks/use{Bible,Hymn}Search.ts so what gets indexed equals what gets
// matched.
function normalizeForFtsContent(text) {
  if (typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeHymnAuthors(authors) {
  if (typeof authors !== 'string' || !authors) return '';
  try {
    const parsed = JSON.parse(authors);
    if (Array.isArray(parsed)) return parsed.join(' ');
  } catch {
    // ignore
  }
  return authors;
}

// ---------------------------------------------------------------------------
// Promise wrappers around sqlite3
// ---------------------------------------------------------------------------

function runAsync(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => (err ? reject(err) : resolve()));
  });
}

function allAsync(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

function finalizeAsync(stmt) {
  return new Promise((resolve, reject) => {
    stmt.finalize((err) => (err ? reject(err) : resolve()));
  });
}

function closeAsync(db) {
  return new Promise((resolve, reject) => {
    db.close((err) => (err ? reject(err) : resolve()));
  });
}

// ---------------------------------------------------------------------------
// PRAGMAs applied at the start of every build
// ---------------------------------------------------------------------------

async function applyBuildPragmas(db) {
  // page_size + auto_vacuum MUST be set before any table is created.
  await runAsync(db, `PRAGMA page_size = 4096`);
  await runAsync(db, `PRAGMA auto_vacuum = NONE`);
  await runAsync(db, `PRAGMA journal_mode = OFF`);
  await runAsync(db, `PRAGMA synchronous = OFF`);
  await runAsync(db, `PRAGMA temp_store = MEMORY`);
  await runAsync(db, `PRAGMA foreign_keys = ON`);
}

// ---------------------------------------------------------------------------
// ZIP (max compression — what ships in production)
// ---------------------------------------------------------------------------

function createZipFromDb(dbPath, zipPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', () => resolve(zipPath));
    archive.on('error', reject);
    archive.on('warning', (err) => {
      if (err.code !== 'ENOENT') reject(err);
    });
    archive.pipe(output);
    archive.file(dbPath, { name: path.basename(dbPath) });
    archive.finalize();
  });
}

// ---------------------------------------------------------------------------
// Size audit
// ---------------------------------------------------------------------------

function sha256(file) {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(file))
    .digest('hex')
    .slice(0, 16);
}

function fmtKB(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function reportSize(label, file) {
  const stats = getFileStats(file);
  if (!stats) {
    console.log(`  ${label.padEnd(30)} MISSING (${normalizePathForDisplay(file)})`);
    return 0;
  }
  console.log(
    `  ${label.padEnd(30)} ${fmtKB(stats.size).padStart(12)}  sha=${sha256(file)}  ${normalizePathForDisplay(file)}`
  );
  return stats.size;
}

module.exports = {
  cleanDisplayText,
  normalizeForFtsContent,
  normalizeHymnAuthors,
  runAsync,
  allAsync,
  finalizeAsync,
  closeAsync,
  applyBuildPragmas,
  createZipFromDb,
  sha256,
  fmtKB,
  reportSize,
  sqlite3,
};
