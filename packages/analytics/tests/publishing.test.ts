import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';
import { EVENTS, VERSION } from '../src/index.js';

test('publishes from the canonical repository through GitHub Packages', async () => {
  const packageJson = JSON.parse(await readFile(resolve('package.json'), 'utf8')) as {
    bin?: Record<string, string>;
    repository?: { directory?: string; type?: string; url?: string };
    publishConfig?: { access?: string; registry?: string };
    files?: string[];
    version?: string;
  };
  const workflow = await readFile(resolve('../../.github/workflows/publish.yml'), 'utf8');
  const weekly = await readFile(resolve('../../.github/workflows/weekly.yml'), 'utf8');

  expect(packageJson.repository).toEqual({
    directory: 'packages/analytics',
    type: 'git',
    url: 'git+https://github.com/LasVegasForTransit/analytics.git',
  });
  expect(packageJson.publishConfig).toEqual({
    access: 'restricted',
    registry: 'https://npm.pkg.github.com',
  });
  expect(workflow).toContain('pnpm publish --access restricted --no-git-checks');
  expect(workflow).not.toMatch(/(^|\s)npm publish/);
  expect(workflow).toContain('packages: write');
  expect(workflow).toContain('NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}');
  expect(packageJson.version).toBe('0.2.0');
  expect(VERSION).toBe(packageJson.version);
  expect(packageJson.bin).toEqual({ 'lvbt-analytics': 'dist/cli/index.mjs' });
  expect(packageJson.files).toContain('LICENSE');
  await expect(readFile(resolve('LICENSE'), 'utf8')).resolves.toBe(
    await readFile(resolve('../../LICENSE'), 'utf8'),
  );
  const productionSites = [...new Set(Object.values(EVENTS).flatMap((event) => event.sites))];
  for (const site of productionSites) {
    expect(weekly).toContain(`verify https://${site}`);
    expect(weekly).toContain(`--site ${site} --expect present`);
  }
});
