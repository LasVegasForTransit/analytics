import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '../../..');
const runtime = createRequire(import.meta.url).resolve('tsx');
interface RunnerConfiguration {
  test?: {
    environment?: string;
    environmentOptions?: unknown;
    include?: string[];
    exclude?: string[];
    passWithNoTests?: boolean;
  };
  projects?: { name: string }[];
  use?: { trace: string; baseURL: string; launchOptions: { args: string[] } };
  webServer?: { url: string; reuseExistingServer: boolean };
  plugins?: string[];
}
const configurations = new Map<string, RunnerConfiguration>();
function configuration(file: string): RunnerConfiguration {
  const existing = configurations.get(file);
  if (existing) return existing;
  const result = JSON.parse(
    execFileSync(
      process.execPath,
      [
        '--import',
        runtime,
        '--input-type=module',
        '--eval',
        `const {default:c} = await import(${JSON.stringify(path.join(root, file))});
        console.log(JSON.stringify({...c, plugins:c.plugins?.flat(Infinity).map(p=>p.name)}));`,
      ],
      { cwd: root, encoding: 'utf8' },
    ),
  ) as RunnerConfiguration;
  configurations.set(file, result);
  return result;
}

it('all unit runners exclude browser/support artifacts and reject empty suites without replacing their product runtime', () => {
  for (const file of [
    'packages/analytics/vitest.config.ts',
    'apps/collector/vitest.config.ts',
    'tools/report/vitest.config.ts',
  ]) {
    const config = configuration(file);
    expect(config.test?.passWithNoTests, file).toBe(false);
    expect(config.test?.exclude, file).toEqual(
      expect.arrayContaining(['tests/e2e/**', 'tests/support/**', '**/dist/**']),
    );
    expect(config.test?.include, file).toContain('tests/**/*.test.ts');
  }
  expect(configuration('packages/analytics/vitest.config.ts').test).toMatchObject({
    environment: 'happy-dom',
    environmentOptions: { happyDOM: { url: 'https://test.example/' } },
  });
  expect(configuration('apps/collector/vitest.config.ts').plugins).toContain(
    '@cloudflare/vitest-pool-workers',
  );
});

it('browser privacy acceptance uses both shared Chromium profiles and retained traces at the production-like test origin', () => {
  const config = configuration('packages/analytics/playwright.config.ts');
  expect(config.projects?.map(({ name }) => name)).toEqual(['desktop', 'mobile']);
  expect(config.use?.trace).toBe('retain-on-failure');
  expect(config.use?.baseURL).toBe('http://analytics.test:4174/');
  expect(config.use?.launchOptions.args).toContain(
    '--host-resolver-rules=MAP analytics.test 127.0.0.1',
  );
  expect(config.webServer).toMatchObject({
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: false,
  });
});
