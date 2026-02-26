// config/paths.config.js
/**
 * Environment-specific configuration for SmartBaibolyYarn
 * This file centralizes all environment-specific paths and settings
 * to ensure compatibility across different development machines
 */

const path = require('path');
const os = require('os');

// Detect the current operating system
const platform = process.platform;
const isWindows = platform === 'win32';
const isMacOS = platform === 'darwin';
const isLinux = platform === 'linux';

// Get the current user's home directory in a cross-platform way
const getUserHome = () => os.homedir();

// Common development paths that might need to be customized
const getDevelopmentPaths = () => {
  const userHome = getUserHome();
  
  // Default paths based on OS
  const defaults = {
    windows: {
      // Common Windows development locations
      projects: path.join(userHome, 'Documents'),
      desktop: path.join(userHome, 'Desktop'),
      // Add your specific Windows paths here if needed
    },
    macos: {
      // Common macOS development locations
      projects: path.join(userHome, 'Documents'),
      desktop: path.join(userHome, 'Desktop'),
      // Add your specific macOS paths here if needed
    },
    linux: {
      // Common Linux development locations
      projects: path.join(userHome, 'Documents'),
      desktop: path.join(userHome, 'Desktop'),
      // Add your specific Linux paths here if needed
    },
  };

  const currentOS = isWindows ? defaults.windows : 
                   isMacOS ? defaults.macos : 
                   defaults.linux;

  return {
    ...currentOS,
    userHome,
    platform,
    isWindows,
    isMacOS,
    isLinux,
  };
};

// Path normalization utilities
const normalizePath = (filePath) => {
  // Convert all path separators to forward slashes for consistency
  return path.resolve(filePath).replace(/\\/g, '/');
};

const getRelativePath = (from, to) => {
  return normalizePath(path.relative(from, to));
};

// Environment-specific project settings
const projectConfig = {
  // Override these paths in your local environment if needed
  customPaths: {
    // Example: If your project is in a different location
    // projectRoot: '/custom/path/to/SmartBaibolyYarn',
  },
  
  // Get the effective paths (custom or default)
  getEffectivePaths() {
    const devPaths = getDevelopmentPaths();
    
    return {
      // Project root (can be overridden)
      projectRoot: this.customPaths.projectRoot || process.cwd(),
      
      // Development environment info
      environment: {
        ...devPaths,
        nodeVersion: process.version,
        npmVersion: process.env.npm_config_user_agent || 'unknown',
      },
      
      // Path utilities
      utils: {
        normalizePath,
        getRelativePath,
      },
    };
  },
};

// Export the configuration
module.exports = {
  ...getDevelopmentPaths(),
  normalizePath,
  getRelativePath,
  projectConfig,
  getUserHome,
};
