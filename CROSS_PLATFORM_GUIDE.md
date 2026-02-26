# Cross-Platform Development Guide

This document explains how the SmartBaibolyYarn project handles cross-platform compatibility for development environments.

## Overview

The project has been updated to work seamlessly across Windows, macOS, and Linux development machines. All hardcoded paths have been replaced with dynamic, cross-platform path handling.

## Key Changes

### 1. Centralized Path Utilities

#### React Native App (`src/utils/paths.ts`)
- Provides platform-specific path handling for the mobile app
- Handles Android vs iOS differences automatically
- Centralizes all file system operations

#### Node.js Scripts (`scripts/utils/paths.js`)
- Cross-platform path handling for build scripts
- Automatic detection of operating system
- Consistent path separators and directory handling

#### Configuration (`config/paths.config.js`)
- Environment-specific configuration
- Customizable paths for different development setups
- OS detection and user home directory handling

### 2. Updated Files

#### Database Service (`src/services/database/DatabaseService.ts`)
- Now uses centralized path utilities
- Better error handling for file operations
- Cross-platform database copying

#### Data Importer (`src/services/database/DataImporter.ts`)
- Uses platform-agnostic file operations
- Consistent path handling across platforms

#### Build Script (`scripts/buildDatabase.js`)
- Cross-platform asset management
- Better error messages with normalized paths
- Automatic directory creation

## Usage

### For Development

1. **Clone the repository** on any platform:
   ```bash
   git clone <repository-url>
   cd SmartBaibolyYarn
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Build databases** (works on any platform):
   ```bash
   node scripts/buildDatabase.js
   ```

### For Custom Paths

If your project is located in a non-standard location, you can customize paths in `config/paths.config.js`:

```javascript
// config/paths.config.js
const projectConfig = {
  customPaths: {
    // Override project root if needed
    projectRoot: '/your/custom/path/to/SmartBaibolyYarn',
  },
  // ... rest of configuration
};
```

### Platform-Specific Notes

#### Windows
- Uses forward slashes internally for consistency
- Handles Windows path separators automatically
- Compatible with both CMD and PowerShell

#### macOS
- Standard Unix-style paths
- Handles macOS-specific bundle paths for iOS
- Compatible with both Intel and Apple Silicon

#### Linux
- Standard Unix-style paths
- Handles various Linux distributions
- Compatible with common desktop environments

## File Structure

```
SmartBaibolyYarn/
├── config/
│   └── paths.config.js          # Environment configuration
├── src/
│   ├── utils/
│   │   └── paths.ts             # React Native path utilities
│   └── services/
│       └── database/            # Updated database services
├── scripts/
│   ├── utils/
│   │   └── paths.js             # Node.js path utilities
│   └── buildDatabase.js         # Updated build script
└── assets/
    └── data/                    # Cross-platform assets
```

## Benefits

1. **No Hardcoded Paths**: All paths are generated dynamically
2. **OS Detection**: Automatic handling of platform differences
3. **Consistent API**: Same interface across all platforms
4. **Error Handling**: Better error messages with path normalization
5. **Maintainability**: Centralized path management
6. **Scalability**: Easy to add new platforms or environments

## Troubleshooting

### Path Issues
If you encounter path-related issues:

1. Check the console output for normalized paths
2. Verify the project structure matches expectations
3. Ensure all required directories exist
4. Check custom path configurations in `config/paths.config.js`

### Permission Issues
- Ensure write permissions for assets directories
- Check database file permissions
- Verify script execution permissions

### Platform-Specific Issues
- Windows: Check for long path support
- macOS: Verify Xcode command line tools
- Linux: Check file system permissions

## Migration Notes

The project has been migrated from hardcoded paths like:
- `C:\Users\arotiana.randrianaso\MockProjects\SmartBaibolyYarn`
- `/Users/arotiana/projects/SmartBaibolyYarn`

To dynamic paths that work on any platform where the project is cloned.

## Contributing

When adding new features:

1. Use the centralized path utilities
2. Test on multiple platforms if possible
3. Update this documentation if adding new path handling
4. Follow the existing patterns for cross-platform compatibility
