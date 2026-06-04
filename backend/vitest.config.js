import { defineConfig } from 'vitest/config';
import path from 'node:path';

const TEST_DB_PATH = path.resolve('./prisma/test.db');

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.js'],
    globalSetup: './tests/setup.js',
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: `file:${TEST_DB_PATH}`,
      SECRET_KEY: 'test_secret_key_for_unit_tests',
    },
  },
});
