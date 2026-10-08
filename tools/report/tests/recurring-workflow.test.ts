import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';

async function actions(event: string, healthy: boolean, empty = false, retainFailure = false) {
  const workflow = await readFile(path.resolve('../../.github/workflows/weekly.yml'), 'utf8');
  const source = /node --input-type=module <<'NODE'\n([\s\S]*?)\n {10}NODE/.exec(workflow)?.[1];
  if (!source) throw new Error('Missing contribution action producer.');
  const directory = await mkdtemp(path.join(os.tmpdir(), 'lvbt-weekly-actions-'));
  try {
    if (healthy) {
      await writeFile(
        path.join(directory, 'report-7.md'),
        empty ? '' : '# Seven days\n\n12 visits.',
      );
      await writeFile(path.join(directory, 'report-30.md'), '# Thirty days\n\n50 visits.');
    }
    let producerFailed = false;
    try {
      execFileSync(process.execPath, ['--input-type=module', '-e', source], {
        cwd: directory,
        stdio: 'pipe',
        env: {
          ...process.env,
          BUILD_OUTCOME: 'success',
          VERIFY_OUTCOME: healthy ? 'success' : 'failure',
          REPORT_OUTCOME: healthy ? 'success' : 'skipped',
          GITHUB_SERVER_URL: 'https://github.com',
          GITHUB_REPOSITORY: 'LasVegasForTransit/analytics',
          GITHUB_RUN_ID: '123',
          GITHUB_RUN_ATTEMPT: '2',
          GITHUB_SHA: 'a'.repeat(40),
          GITHUB_REF_NAME: 'main',
          GITHUB_EVENT_NAME: event,
        },
      });
    } catch (error) {
      if (!retainFailure) throw error;
      producerFailed = true;
    }
    return {
      producerFailed,
      ...JSON.parse(await readFile(path.join(directory, 'lvbt-recurring-issues.json'), 'utf8')),
    } as {
      producerFailed: boolean;
      run: { id: string; attempt: number };
      results: { key: string; status: string; body?: string }[];
    };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
test('a successful measurement retains both real reports and resolves only the maintenance key', async () => {
  const value = await actions('schedule', true);
  expect(value.run).toMatchObject({ id: '123', attempt: 2 });
  expect(value.results[0]).toMatchObject({ key: 'weekly-report', status: 'open' });
  expect(value.results[0]?.body).toContain('12 visits');
  expect(value.results[0]?.body).toContain('50 visits');
  expect(value.results[1]).toMatchObject({ key: 'weekly-maintenance', status: 'resolved' });
});
test('failed scheduled measurement cannot clear the report and records the actual failed step', async () => {
  const value = await actions('schedule', false);
  expect(value.results[0]).toMatchObject({ key: 'weekly-report', status: 'error' });
  expect(value.results[0]?.body).toBeUndefined();
  expect(value.results[1]).toMatchObject({ key: 'weekly-maintenance', status: 'open' });
  expect(value.results[1]?.body).toContain('public verification: failure; reports: skipped');
});
test('a failed manual measurement preserves the scheduled alert policy', async () => {
  const value = await actions('workflow_dispatch', false);
  expect(value.results.map(({ status }) => status)).toEqual(['error', 'error']);
});
test('an empty measurement report fails before producing apparently successful actions', async () => {
  await expect(actions('schedule', true, true)).rejects.toThrow();
});

test('empty scheduled reports retain an error action and actionable maintenance evidence', async () => {
  const value = await actions('schedule', true, true, true);
  expect(value.producerFailed).toBe(true);
  expect(value.results[0]).toMatchObject({ key: 'weekly-report', status: 'error' });
  expect(value.results[1]).toMatchObject({ key: 'weekly-maintenance', status: 'open' });
  expect(value.results[1]?.body).toContain('Missing report content: report-7.md');
});
