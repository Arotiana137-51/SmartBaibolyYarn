// scripts/utils/paths.js
/**
 * Cross-platform path utilities for Node.js scripts
 * This centralizes all path handling to ensure compatibility across
 * Windows, macOS, and Linux development environments
 */

const path = require('path');
const fs = require('fs');

// Get the project root directory
const getProjectRoot = () => {
  return path.resolve(__dirname, '../..');
};

// Cross-platform asset paths with dev/prod separation
const getAssetsPaths = () => {
  const projectRoot = getProjectRoot();
  
  return {
    root: path.join(projectRoot, 'assets', 'data'),
    dev: path.join(projectRoot, 'assets', 'data', 'dev'),
    prod: path.join(projectRoot, 'assets', 'data', 'prod'),
    android: {
      root: path.join(projectRoot, 'android', 'app', 'src', 'main', 'assets', 'data'),
      dev: path.join(projectRoot, 'android', 'app', 'src', 'main', 'assets', 'data', 'dev'),
      prod: path.join(projectRoot, 'android', 'app', 'src', 'main', 'assets', 'data', 'prod'),
    },
    ios: {
      root: path.join(projectRoot, 'ios', 'SmartBaibolyYarn', 'Resources', 'data'),
      dev: path.join(projectRoot, 'ios', 'SmartBaibolyYarn', 'Resources', 'data', 'dev'),
      prod: path.join(projectRoot, 'ios', 'SmartBaibolyYarn', 'Resources', 'data', 'prod'),
    },
  };
};

// Cross-platform source data paths
const getSourceDataPaths = () => {
  const projectRoot = getProjectRoot();
  
  return {
    bible: path.join(projectRoot, 'src', 'data', 'bible'),
    hymns: path.join(projectRoot, 'src', 'data', 'hymns'),
  };
};

// Database file paths with dev/prod separation
const getDatabasePaths = () => {
  const assets = getAssetsPaths();
  
  return {
    bible: {
      source: path.join(getSourceDataPaths().bible, 'Bible_MG65.json'),
      crossReferences: path.join(getSourceDataPaths().bible, 'cross_references.txt'),
      // Dev mode: uncompressed .db files
      dev: path.join(assets.dev, 'BibleMG65.db'),
      androidDev: path.join(assets.android.dev, 'BibleMG65.db'),
      iosDev: path.join(assets.ios.dev, 'BibleMG65.db'),
      // Prod mode: compressed .zip files
      prod: path.join(assets.prod, 'BibleMG65.zip'),
      androidProd: path.join(assets.android.prod, 'BibleMG65.zip'),
      iosProd: path.join(assets.ios.prod, 'BibleMG65.zip'),
    },
    hymns: {
      source: getSourceDataPaths().hymns,
      // Dev mode: uncompressed .db files
      dev: path.join(assets.dev, 'Hymns.db'),
      androidDev: path.join(assets.android.dev, 'Hymns.db'),
      iosDev: path.join(assets.ios.dev, 'Hymns.db'),
      // Prod mode: compressed .zip files
      prod: path.join(assets.prod, 'Hymns.zip'),
      androidProd: path.join(assets.android.prod, 'Hymns.zip'),
      iosProd: path.join(assets.ios.prod, 'Hymns.zip'),
    },
  };
};

// Ensure directory exists (cross-platform)
const ensureDirectory = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 Created directory: ${dirPath}`);
  }
};

// Copy file cross-platform with error handling
const copyFileSafe = (source, destination) => {
  try {
    fs.copyFileSync(source, destination);
    console.log(`📋 Copied: ${source} -> ${destination}`);
  } catch (error) {
    console.error(`❌ Failed to copy ${source} to ${destination}:`, error.message);
    throw error;
  }
};

// Get file stats safely
const getFileStats = (filePath) => {
  try {
    return fs.statSync(filePath);
  } catch (error) {
    console.warn(`⚠️ Cannot get stats for ${filePath}:`, error.message);
    return null;
  }
};

// Normalize path for display (handles different OS path separators)
const normalizePathForDisplay = (filePath) => {
  return path.relative(getProjectRoot(), filePath).replace(/\\/g, '/');
};

module.exports = {
  getProjectRoot,
  getAssetsPaths,
  getSourceDataPaths,
  getDatabasePaths,
  ensureDirectory,
  copyFileSafe,
  getFileStats,
  normalizePathForDisplay,
};
