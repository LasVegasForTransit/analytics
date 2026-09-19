import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const directory = await mkdtemp(join(tmpdir(), 'lvbt-analytics-package-'));
const output = join(directory, 'lvbt-analytics.mjs');
const result = spawnSync(process.execPath, ['dist/cli/index.mjs', 'client', '--out', output], {
  encoding: 'utf8',
});
if (result.status !== 0) throw new Error(result.stderr || 'Client generation failed.');
const client = await readFile(output, 'utf8');
if (/\bfrom\s+["']\.\//.test(client))
  throw new Error('Generated plain-HTML client contains an unresolved relative import.');
const syntax = spawnSync(process.execPath, ['--check', output], { encoding: 'utf8' });
if (syntax.status !== 0)
  throw new Error(syntax.stderr || 'Generated client is not valid JavaScript.');

const astro = await readFile('astro/index.ts', 'utf8');
if (astro.includes('../src/'))
  throw new Error('Published Astro source references an unpublished source file.');
