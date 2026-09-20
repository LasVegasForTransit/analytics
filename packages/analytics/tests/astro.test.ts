import { afterEach, expect, test, vi } from 'vitest';
import { lvbtAnalytics } from '../astro/index.js';

afterEach(() => {
  delete process.env.PUBLIC_LVBT_ANALYTICS_COLLECTOR;
  delete process.env.PUBLIC_LVBT_CWA_TOKEN;
  delete process.env.LVBT_REQUIRE_ANALYTICS;
});

test('reads the standard collector override from the build environment', async () => {
  process.env.PUBLIC_LVBT_CWA_TOKEN = 'a'.repeat(32);
  process.env.PUBLIC_LVBT_ANALYTICS_COLLECTOR = 'https://events-staging.example';
  const injectScript = vi.fn();
  const integration = lvbtAnalytics({ site: 'labs.lasvegasfortransit.org' });

  await integration.hooks['astro:config:setup']?.({
    command: 'build',
    config: { root: new URL('file:///tmp/site/'), envDir: '/tmp/site' },
    injectScript,
    updateConfig: vi.fn(),
  } as never);

  expect(injectScript).toHaveBeenCalledWith(
    'page',
    expect.stringContaining('https://events-staging.example'),
  );
});

test('injects the production client and prevents JavaScript inlining', async () => {
  process.env.PUBLIC_LVBT_CWA_TOKEN = 'a'.repeat(32);
  const injectScript = vi.fn();
  const updateConfig = vi.fn();
  const integration = lvbtAnalytics({
    site: 'labs.lasvegasfortransit.org',
    exclude: ['^/archive/'],
  });

  await integration.hooks['astro:config:setup']?.({
    command: 'build',
    config: { root: new URL('file:///tmp/site/'), envDir: '/tmp/site' },
    injectScript,
    updateConfig,
  } as never);

  expect(injectScript).toHaveBeenCalledWith(
    'page',
    expect.stringContaining('@lasvegasfortransit/analytics'),
  );
  expect(injectScript).toHaveBeenCalledWith(
    'page',
    expect.stringContaining('labs.lasvegasfortransit.org'),
  );
  expect(injectScript).toHaveBeenCalledWith(
    'page',
    expect.stringContaining('new RegExp("^/archive/")'),
  );
  expect(updateConfig).toHaveBeenCalledWith({ vite: { build: { assetsInlineLimit: 0 } } });
});

test('requires the token only for guarded production builds', () => {
  process.env.LVBT_REQUIRE_ANALYTICS = '1';
  const integration = lvbtAnalytics({ site: 'labs.lasvegasfortransit.org' });
  expect(() =>
    integration.hooks['astro:config:setup']?.({
      command: 'build',
      config: { root: new URL('file:///tmp/site/'), envDir: '/tmp/site' },
      injectScript: vi.fn(),
      updateConfig: vi.fn(),
    } as never),
  ).toThrow('PUBLIC_LVBT_CWA_TOKEN');
});
