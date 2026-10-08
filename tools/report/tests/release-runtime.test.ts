import { execFile, execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { beforeAll, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '../../..');
const require = createRequire(import.meta.url);
const runtime = require.resolve('tsx');

it('the installed CLI reaches the real shared artifact and attestation engine without a root tsx command', () => {
  const temporary = mkdtempSync(path.join(tmpdir(), 'lvbt-analytics-attestation-'));
  const artifact = path.join(temporary, 'artifact');
  const proof = path.join(temporary, 'proof');
  try {
    mkdirSync(path.join(artifact, '.wrangler/worker'), { recursive: true });
    writeFileSync(path.join(artifact, '.wrangler/worker/index.js'), 'export default {};\n');
    writeFileSync(
      path.join(artifact, 'wrangler.jsonc'),
      '{"name":"fixture","main":".wrangler/worker/index.js"}\n',
    );
    const commit = 'a'.repeat(40);
    execFileSync(
      process.execPath,
      [
        '--import',
        runtime,
        '--input-type=module',
        '--eval',
        `
      const {sealSavedRelease} = await import('@lasvegasfortransit/web-platform/release');
      await sealSavedRelease(${JSON.stringify(artifact)}, {commit:${JSON.stringify(commit)},releaseId:'fixture-1'},'worker');
    `,
      ],
      { cwd: root, stdio: 'pipe' },
    );
    const cli = path.resolve(
      path.dirname(require.resolve('@lasvegasfortransit/cli/env')),
      '../cli.mjs',
    );
    execFileSync(
      process.execPath,
      [
        cli,
        'release',
        'attestation',
        'manifest',
        '--directory',
        artifact,
        '--attestation-directory',
        proof,
        '--commit',
        commit,
        '--release-id',
        'fixture-1',
      ],
      { cwd: root, stdio: 'pipe' },
    );
    expect(JSON.parse(readFileSync(path.join(proof, 'release-attestation.json'), 'utf8'))).toEqual(
      JSON.parse(readFileSync(path.join(artifact, 'release.json'), 'utf8')),
    );
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}, 15_000);

let reportDiagnostic = '';
// Starting pnpm and its owning package is bounded integration setup. The
// product argument assertions retain the shared unit timeout and need no credentials.
beforeAll(async () => {
  try {
    await promisify(execFile)('pnpm', ['run', 'report', '--days', '8'], {
      cwd: root,
      encoding: 'utf8',
      timeout: 25_000,
    });
  } catch (error) {
    const failure = error as { stderr?: string; stdout?: string };
    reportDiagnostic = `${failure.stderr ?? ''}${failure.stdout ?? ''}`;
  }
}, 30_000);

it('the weekly report command reaches its product argument validation without a root runtime executable', () => {
  expect(reportDiagnostic).toContain('--days must be 7 or 30.');
  expect(reportDiagnostic).not.toMatch(/command not found|Command "tsx" not found/);
});
