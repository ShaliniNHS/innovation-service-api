module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.spec.ts'],
  collectCoverage: true,
  coverageReporters: ['html', 'text', 'text-summary'],
  coverageDirectory: 'coverage/function-app',
  collectCoverageFrom: [
    "**/*.(t|j)s",
  ],
  coveragePathIgnorePatterns: [
    "node_modules",
    "dist",
    "coverage",
    "jest.config.js",
    "schemas",
    "innovatorsCreateInnovation",
    "innovatorsDeleteInnovation",
    "innovatorsGetOne",
    "innovatorsDeleteOne",
    "innovatorsGetAll",
    "innovatorsGetAllInnovations",
    "innovatorsGetInnovation",
    "innovatorsUpdateInnovation",
    "innovatorsUpdateOne",
    "surveyGetOne",
    "usersUpdateInfo",
    "commitizen.js",
    ".eslintrc.js",
  ],
  coverageDirectory: "./coverage",
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: -30
    }
  },
  restoreMocks: true,
  clearMocks: true,
  resetMocks: true,
}