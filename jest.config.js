module.exports = {
  // Automatically clear mock calls and instances between every test
  clearMocks: true,

  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: true,

  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',

  // A list of reporter names that Jest uses when writing coverage reports
  coverageReporters: ['text', 'lcov'],

  // The test environment that will be used for testing
  testEnvironment: 'jsdom',

  // Display individual test results with descriptive messages
  verbose: true,

  // Show a more structured output
  reporters: ['default'],

  // Group related tests together in the output
  displayName: {
    name: 'Spending Tracker',
    color: 'blue',
  },

  // Setup files
  setupFiles: ['<rootDir>/jest.setup.js'],

  // Transform files
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Module name mapper for handling non-JS modules
  moduleNameMapper: {
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/__mocks__/fileMock.js',
    '\\.(css|less)$': '<rootDir>/__mocks__/styleMock.js',
  },

  // Test paths to ignore
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],

  // Transform paths to ignore
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|@react-navigation)',
  ],
};
