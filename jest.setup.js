// Mock react-native
jest.mock('react-native', () => {
  return {
    Platform: { OS: 'ios', select: jest.fn((obj) => obj.ios) },
    NativeModules: {},
    Text: 'Text',
    View: 'View',
  };
});

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
