module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.spec.ts'],
  collectCoverage: true,
  coverageReporters: ['html', 'text', 'text-summary'],
  coverageDirectory: 'coverage/function-app',
  setupFilesAfterEnv: ['<rootDir>/__jest__/jest.setup.ts'],
  collectCoverageFrom: [
    "**/*.(t|j)s",
  ],
  coveragePathIgnorePatterns: [
    "node_modules",
    "dist",
    "coverage",
    "jest.config.js",
    "schemas",
    "utils/cache/*",
    "utils/logging/*",
    "utils/authentication.ts",
    "utils/connection.ts",
    "utils/serviceLoader.ts",
    "utils/types.ts",
    "usersUpdateInfo",
    "utils/decorators",
    "commitizen.js",
    ".eslintrc.js",
    "migrations",
    "__jest__",
    "constants",
    "connnections",
    "strategies",
    "generators",
    "templates",
    "helpers",
    "ormconfig",
    ".connection.ts",
    "jest.setup.ts",
    "__external__/domain/jest",
  ],
  coverageDirectory: "./coverage",
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70
    }
  },
  moduleNameMapper: {
    "@domain/(.*)": "<rootDir>/__external__/domain/src/$1",
    "@services/(.*)": "<rootDir>/__external__/services/src/$1",
    "@entities/(.*)": "<rootDir>/__external__/services/src/entities/$1",
    "@engines/(.*)": "<rootDir>/__external__/engines/$1",
    "@helpers/(.*)": "<rootDir>/__external__/services/src/helpers/$1",
  },
  restoreMocks: true,
  clearMocks: true,
  resetMocks: true,
}