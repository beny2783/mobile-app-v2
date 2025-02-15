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
  testEnvironment: 'node',

  // Display individual test results with descriptive messages
  verbose: true,

  // Show a more structured output
  reporters: ['default', ['jest-summary-reporter', { failuresOnly: true }]],

  // Group related tests together in the output
  displayName: {
    name: 'Spending Tracker',
    color: 'blue',
  },

  // Custom test result processor
  testResultsProcessor: './node_modules/jest-html-reporter',

  // Generate test report in HTML format
  reporters: [
    'default',
    [
      './node_modules/jest-html-reporter',
      {
        pageTitle: 'Test Report',
        outputPath: './test-report.html',
        includeFailureMsg: true,
        includeSuiteFailure: true,
      },
    ],
  ],
};
