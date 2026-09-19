import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { checkHeadersFile } from '../src/node/index.js';

test('checks every content security policy in a headers file', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'lvbt-analytics-'));
  const file = join(directory, '_headers');
  await writeFile(
    file,
    "/*\n  Content-Security-Policy: default-src 'self'; script-src 'self'; connect-src 'self'\n",
  );

  await expect(checkHeadersFile(file)).resolves.toEqual([
    expect.stringContaining('script-src is missing'),
    expect.stringContaining('connect-src is missing'),
    expect.stringContaining('connect-src is missing'),
  ]);
});

test('reports a missing content security policy', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'lvbt-analytics-'));
  const file = join(directory, '_headers');
  await writeFile(file, '/*\n  X-Content-Type-Options: nosniff\n');
  await expect(checkHeadersFile(file)).resolves.toEqual([
    'No Content-Security-Policy header was found.',
  ]);
});
