module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-clone-referenced-element)/)',
  ],
  setupFiles: ['<rootDir>/node_modules/react-native/jest/setup.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
