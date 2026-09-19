import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';
import { VERSION } from '../src/index.js';

test('publishes from the canonical repository through npm trusted publishing', async () => {
  const packageJson = JSON.parse(await readFile(resolve('package.json'), 'utf8')) as {
    bin?: Record<string, string>;
    repository?: { directory?: string; type?: string; url?: string };
    version?: string;
  };
  const workflow = await readFile(resolve('../../.github/workflows/publish.yml'), 'utf8');
  const weekly = await readFile(resolve('../../.github/workflows/weekly.yml'), 'utf8');

  expect(packageJson.repository).toEqual({
    directory: 'packages/analytics',
    type: 'git',
    url: 'git+https://github.com/LasVegasForTransit/analytics.git',
  });
  expect(workflow).toContain('npm publish --access public');
  expect(workflow).not.toContain('pnpm publish');
  expect(workflow).not.toContain('NODE_AUTH_TOKEN');
  expect(packageJson.version).toBe('0.1.0');
  expect(VERSION).toBe(packageJson.version);
  expect(packageJson.bin).toEqual({ 'lvbt-analytics': 'dist/cli/index.mjs' });
  await expect(readFile(resolve('LICENSE'), 'utf8')).resolves.toBe(
    await readFile(resolve('../../LICENSE'), 'utf8'),
  );
  expect(weekly).toContain('https://fund.lasvegasfortransit.org');
});
