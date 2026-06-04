import { execSync } from 'node:child_process';
import { rmSync, existsSync } from 'node:fs';
import path from 'node:path';

const TEST_DB_PATH = path.resolve('./prisma/test.db');
const TEST_DATABASE_URL = `file:${TEST_DB_PATH}`;

export default async function setup() {
  if (existsSync(TEST_DB_PATH)) {
    rmSync(TEST_DB_PATH);
  }

  execSync('npx prisma db push --skip-generate', {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'inherit',
  });

  return async () => {
    if (existsSync(TEST_DB_PATH)) {
      rmSync(TEST_DB_PATH);
    }
  };
}
