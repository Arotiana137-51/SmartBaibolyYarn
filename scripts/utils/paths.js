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

// Cross-platform asset paths
const getAssetsPaths = () => {
  const projectRoot = getProjectRoot();
  
  return {
    root: path.join(projectRoot, 'assets', 'data'),
    android: path.join(projectRoot, 'android', 'app', 'src', 'main', 'assets', 'data'),
    ios: path.join(projectRoot, 'ios', 'SmartBaibolyYarn', 'Resources', 'data'),
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

// Database file paths
const getDatabasePaths = () => {
  const assets = getAssetsPaths();
  
  return {
    bible: {
      source: path.join(getSourceDataPaths().bible, 'Bible_MG65.json'),
      crossReferences: path.join(getSourceDataPaths().bible, 'cross_references.txt'),
      root: path.join(assets.root, 'BibleMG65.db'),
      android: path.join(assets.android, 'BibleMG65.db'),
      ios: path.join(assets.ios, 'BibleMG65.db'),
    },
    hymns: {
      source: getSourceDataPaths().hymns,
      root: path.join(assets.root, 'Hymns.db'),
      android: path.join(assets.android, 'Hymns.db'),
      ios: path.join(assets.ios, 'Hymns.db'),
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
