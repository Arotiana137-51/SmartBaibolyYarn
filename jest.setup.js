jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('react-native-quick-sqlite', () => {
  return {
    open: jest.fn(() => ({
      execute: jest.fn(() => ({rows: []})),
      close: jest.fn(),
    })),
  };
});

jest.mock('react-native-fs', () => {
  return {
    DocumentDirectoryPath: '/mock/documents',
    MainBundlePath: '/mock/bundle',
    readFileAssets: jest.fn(async () => ''),
    readFile: jest.fn(async () => ''),
    writeFile: jest.fn(async () => undefined),
    readDirAssets: jest.fn(async () => []),
    readDir: jest.fn(async () => []),
    exists: jest.fn(async () => false),
    stat: jest.fn(async () => ({size: 0})),
    mkdir: jest.fn(async () => undefined),
    unlink: jest.fn(async () => undefined),
    copyFileAssets: jest.fn(async () => undefined),
    moveFile: jest.fn(async () => undefined),
  };
});

jest.mock('react-native-zip-archive', () => {
  return {
    unzip: jest.fn(async () => undefined),
  };
});

jest.mock('@react-native-community/netinfo', () => {
  return {
    __esModule: true,
    default: {
      fetch: jest.fn(async () => ({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
        details: null,
      })),
      addEventListener: jest.fn(() => jest.fn()),
    },
  };
});
