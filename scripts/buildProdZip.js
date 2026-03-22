// scripts/buildProdZip.js
/**
 * Production build script - Creates ZIP archives from existing .db files
 * This is called ONLY during release builds via Gradle hook
 * Usage: node scripts/buildProdZip.js
 */

const fs = require('fs');
const path = require('path');

// Auto-detect and change to project root if not already there
const currentDir = process.cwd();
const scriptPath = __filename;
const expectedScriptPath = path.join('scripts', 'buildProdZip.js');

// Check if we're running from the wrong directory
if (!fs.existsSync(path.join(currentDir, 'scripts', 'utils', 'paths.js'))) {
  // Try to find project root by looking for package.json
  let searchDir = currentDir;
  let foundRoot = null;
  
  while (searchDir !== path.dirname(searchDir)) {
    if (fs.existsSync(path.join(searchDir, 'package.json')) && 
        fs.existsSync(path.join(searchDir, 'scripts', 'buildProdZip.js'))) {
      foundRoot = searchDir;
      break;
    }
    searchDir = path.dirname(searchDir);
  }
  
  if (foundRoot) {
    process.chdir(foundRoot);
    if (__DEV__) {
      console.log('📁 Auto-detected project root:', foundRoot);
    }
  } else {
    console.error('❌ Could not find project root. Make sure package.json exists.');
    process.exit(1);
  }
}

const archiver = require('archiver');
const { getDatabasePaths, getAssetsPaths, ensureDirectory } = require('./utils/paths');

// Create ZIP archive from database file
async function createZipFromDb(dbPath, zipPath) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(dbPath)) {
      throw new Error(`Source database not found: ${dbPath}`);
    }

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

async function buildProdZips() {
  console.log('🚀 Building production ZIP archives...');

  const databasePaths = getDatabasePaths();
  const assetsPaths = getAssetsPaths();

  // Ensure prod directories exist
  ensureDirectory(assetsPaths.prod);
  ensureDirectory(assetsPaths.android.prod);

  const bibleDevPath = databasePaths.bible.dev;
  const hymnsDevPath = databasePaths.hymns.dev;
  const bibleProdPath = databasePaths.bible.prod;
  const hymnsProdPath = databasePaths.hymns.prod;

  // Check if dev databases exist
  if (!fs.existsSync(bibleDevPath)) {
    throw new Error(`Dev database not found: ${bibleDevPath}. Run 'yarn build:database' first.`);
  }
  if (!fs.existsSync(hymnsDevPath)) {
    throw new Error(`Dev database not found: ${hymnsDevPath}. Run 'yarn build:database' first.`);
  }

  // Create ZIP archives for production
  console.log('🗜️ Creating ZIP archives...');
  await createZipFromDb(bibleDevPath, bibleProdPath);
  await createZipFromDb(hymnsDevPath, hymnsProdPath);

  // Copy to Android prod directory
  console.log('📦 Copying to Android prod assets...');
  fs.copyFileSync(bibleProdPath, databasePaths.bible.androidProd);
  fs.copyFileSync(hymnsProdPath, databasePaths.hymns.androidProd);

  console.log('✅ Production ZIP build completed!');
  console.log(`   Bible: ${bibleProdPath}`);
  console.log(`   Hymns: ${hymnsProdPath}`);
}

// Run the build
buildProdZips()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error building production ZIPs:', error.message);
    process.exit(1);
  });
