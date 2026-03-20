// src/utils/paths.ts
import { Platform } from 'react-native';
import * as FileSystem from 'react-native-fs';

/**
 * Cross-platform path utilities for SmartBaibolyYarn
 * This centralizes all path handling to ensure compatibility across
 * Windows, macOS, and development environments
 */

export const isAndroid = Platform.OS === 'android';
export const isIOS = Platform.OS === 'ios';
export const isDevelopment = __DEV__;

export const getDatabaseAssetPath = (dbName: string): string => {
  // Dev mode: use data/dev/ directory with .db files
  // Production mode: use data/prod/ directory with .zip files
  const subdir = __DEV__ ? 'dev' : 'prod';
  const ext = __DEV__ ? '.db' : '.zip';
  const fileName = dbName.replace(/\.db$/i, ext);
  return `data/${subdir}/${fileName}`;
};

// Base paths for different platforms
export const basePaths = {
  // React Native app paths
  documentDirectory: FileSystem.DocumentDirectoryPath,
  mainBundlePath: FileSystem.MainBundlePath,
  
  // Asset paths (relative to app assets)
  assets: {
    bible: 'data/bible',
    hymns: 'data/hymns',
    databases: 'data',
  },
  
  // Database asset paths
  databaseAssets: {
    bible: getDatabaseAssetPath('BibleMG65.db'),
    hymns: getDatabaseAssetPath('Hymns.db'),
  },
};

/**
 * Gets the platform-specific database directory path
 */
export const getDatabaseDirectory = (): string => {
  return isAndroid 
    ? `${FileSystem.DocumentDirectoryPath}/default`
    : FileSystem.DocumentDirectoryPath;
};

/**
 * Gets the full path for a database file
 */
export const getDatabasePath = (dbName: string): string => {
  const dbDirectory = getDatabaseDirectory();
  return `${dbDirectory}/${dbName}`;
};

/**
 * Gets the base path for Bible data files
 */
export const getBibleDataPath = (): string => {
  return isAndroid 
    ? basePaths.assets.bible 
    : `${FileSystem.MainBundlePath}/src/data/bible`;
};

/**
 * Gets the base path for Hymns data files
 */
export const getHymnsDataPath = (): string => {
  return isAndroid 
    ? basePaths.assets.hymns 
    : `${FileSystem.MainBundlePath}/src/data/hymns`;
};

/**
 * Platform-safe file reading function
 */
export const readFileSafe = async (path: string, encoding: 'utf8' | 'base64' = 'utf8'): Promise<string> => {
  return isAndroid 
    ? FileSystem.readFileAssets(path, encoding)
    : FileSystem.readFile(path, encoding);
};

/**
 * Platform-safe directory reading function
 */
export const readDirSafe = async (path: string): Promise<any[]> => {
  return isAndroid 
    ? FileSystem.readDirAssets(path)
    : FileSystem.readDir(path);
};

/**
 * Platform-safe file existence check
 */
export const fileExistsSafe = async (path: string): Promise<boolean> => {
  try {
    return await FileSystem.exists(path);
  } catch {
    return false;
  }
};

/**
 * Gets the full path for a specific Bible testament
 */
export const getTestamentPath = (testament: 'old_testament' | 'new_testament'): string => {
  const basePath = getBibleDataPath();
  return `${basePath}/${testament}`;
};

/**
 * Gets the full path for a specific hymn file
 */
export const getHymnFilePath = (fileName: string): string => {
  const basePath = getHymnsDataPath();
  return `${basePath}/${fileName}`;
};

/**
 * Ensures a directory exists (platform-safe)
 */
export const ensureDirectoryExists = async (path: string): Promise<void> => {
  try {
    await FileSystem.mkdir(path);
  } catch (error) {
    // Directory might already exist, which is fine
    console.log(`Directory ${path} already exists or creation failed:`, error);
  }
};

/**
 * Copies database from assets to device storage
 */
export const copyDatabaseFromAssets = async (
  assetPath: string, 
  targetPath: string
): Promise<void> => {
  const dbDirectory = getDatabaseDirectory();
  await ensureDirectoryExists(dbDirectory);

  if (assetPath.toLowerCase().endsWith('.zip')) {
    const zipTargetPath = `${targetPath}.zip`;
    try {
      if (isAndroid) {
        await FileSystem.copyFileAssets(assetPath, zipTargetPath);
      } else {
        const assetData = await FileSystem.readFileAssets(assetPath, 'base64');
        await FileSystem.writeFile(zipTargetPath, assetData, 'base64');
      }
    } catch (error) {
      const fallbackAssetPath = assetPath.replace(/\.zip$/i, '.db');
      console.warn(
        `Failed to copy ZIP database asset (${assetPath}). Falling back to DB asset (${fallbackAssetPath}).`,
        error
      );
      if (isAndroid) {
        await FileSystem.copyFileAssets(fallbackAssetPath, targetPath);
      } else {
        const assetData = await FileSystem.readFileAssets(fallbackAssetPath, 'base64');
        await FileSystem.writeFile(targetPath, assetData, 'base64');
      }
      return;
    }

    try {
      const zipArchive: any = require('react-native-zip-archive');
      await zipArchive.unzip(zipTargetPath, dbDirectory);

      const expectedExists = await fileExistsSafe(targetPath);
      if (!expectedExists) {
        const expectedFileName = targetPath.split('/').pop();

        if (expectedFileName) {
          const entries = await FileSystem.readDir(dbDirectory);
          const directMatch = entries.find(
            e => e.isFile() && e.name === expectedFileName
          );

          if (directMatch) {
            await FileSystem.moveFile(directMatch.path, targetPath);
          } else {
            for (const entry of entries) {
              if (!entry.isDirectory()) {
                continue;
              }
              const subEntries = await FileSystem.readDir(entry.path);
              const nestedMatch = subEntries.find(
                e => e.isFile() && e.name === expectedFileName
              );
              if (nestedMatch) {
                await FileSystem.moveFile(nestedMatch.path, targetPath);
                break;
              }
            }
          }
        }
      }
    } finally {
      try {
        await FileSystem.unlink(zipTargetPath);
      } catch {
        // ignore
      }
    }
    return;
  }
  
  if (isAndroid) {
    await FileSystem.copyFileAssets(assetPath, targetPath);
  } else {
    // iOS: Read from bundle and write to Documents as binary
    const assetData = await FileSystem.readFileAssets(assetPath, 'base64');
    await FileSystem.writeFile(targetPath, assetData, 'base64');
  }
};

// Export commonly used paths for convenience
export const paths = {
  database: {
    directory: getDatabaseDirectory(),
    bible: getDatabasePath('BibleMG65.db'),
    hymns: getDatabasePath('Hymns.db'),
  },
  data: {
    bible: getBibleDataPath(),
    hymns: getHymnsDataPath(),
  },
  assets: basePaths.assets,
};
