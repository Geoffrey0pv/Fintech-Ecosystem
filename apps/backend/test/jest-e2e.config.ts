import type { Config } from 'jest';

/**
 * End-to-end tests run against a REAL PostgreSQL database (no mocks for business data).
 * The CI workflow and `docker-compose` provide that database via DATABASE_URL.
 */
const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '..',
  testRegex: 'test/e2e/.*\\.e2e-spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
  },
  testEnvironment: 'node',
  testTimeout: 30000,
};

export default config;
