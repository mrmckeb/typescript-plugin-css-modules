module.exports = {
  clearMocks: true,
  collectCoverageFrom: ['src/**/*.{ts}'],
  preset: 'ts-jest',
  setupFiles: ['<rootDir>/src/setup-tests.ts'],
  // See: https://github.com/sass/dart-sass/issues/1692
  testEnvironment: 'jest-environment-node-single-context',
  testPathIgnorePatterns: ['/node_modules/', '/fixtures/'],
};
