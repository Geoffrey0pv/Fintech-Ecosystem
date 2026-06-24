import type { Config } from 'jest';

/**
 * Unit + service-level test configuration.
 * E2E tests (which hit a real PostgreSQL instance) use test/jest-e2e.config.ts.
 */
const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.json' }],
  },
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    '^@modules/(.*)$': '<rootDir>/modules/$1',
  },
  // Unit coverage targets business logic (domain + application + security core).
  // HTTP controllers and Prisma adapters are exercised by the e2e suite (real DB).
  collectCoverageFrom: [
    'modules/**/application/**/*.ts',
    'shared/**/domain/**/*.ts',
    'shared/infrastructure/security/token.service.ts',
    '!**/*.spec.ts',
    '!**/ports/**',
    '!**/dto/**',
  ],
  coverageDirectory: '../coverage',
  coverageThreshold: {
    global: { lines: 80, branches: 75, functions: 80, statements: 80 },
    './src/**/domain/**': { lines: 90, branches: 85 },
  },
  testEnvironment: 'node',
};

export default config;
