import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test, vi } from 'vitest';
import { eventsMarkdown, verifyDeployment, type VerifyPage } from '../src/cli/commands.js';

test('renders the event reference from the runtime allowlist', () => {
  const markdown = eventsMarkdown();
  expect(markdown).toContain('| `newsletter_signup` | server |');
  expect(markdown).toContain('`placement`: `header`, `footer`, `hero`, `inline`, `dialog`');
  expect(markdown).not.toContain('[object Object]');
});

test('keeps the committed event reference synchronized with the runtime allowlist', async () => {
  const reference = await readFile(
    resolve('../../docs/development/reference/event-allowlist.md'),
    'utf8',
  );
  const committed = reference
    .split('<!-- generated-events:start -->')[1]
    ?.split('<!-- generated-events:end -->')[0];
  const normalizeTable = (table: string) =>
    table
      .trim()
      .split('\n')
      .map((line) =>
        line
          .trim()
          .split('|')
          .map((cell) => (/^-+$/.test(cell.trim()) ? '---' : cell.trim()))
          .join('|'),
      )
      .join('\n');
  expect(normalizeTable(committed ?? '')).toBe(normalizeTable(eventsMarkdown()));
});

function pageThatRequests(...requestedUrls: string[]): VerifyPage {
  const routes: Array<{
    pattern: string;
    handler: (route: {
      fulfill(options: { body?: string; contentType?: string; status: number }): Promise<void>;
      request(): { url(): string };
    }) => Promise<unknown>;
  }> = [];
  const goto: VerifyPage['goto'] = async () => {
    for (const url of requestedUrls) {
      const route = routes.find(({ pattern }) =>
        pattern.endsWith('/**') ? url.startsWith(pattern.slice(0, -2)) : url === pattern,
      );
      await route?.handler({
        fulfill: () => Promise.resolve(),
        request: () => ({ url: () => url }),
      });
    }
  };
  const route: VerifyPage['route'] = (pattern, handler) => {
    routes.push({ handler, pattern });
    return Promise.resolve();
  };
  const waitForTimeout: VerifyPage['waitForTimeout'] = () => Promise.resolve();
  return {
    goto: vi.fn(goto),
    route: vi.fn(route),
    waitForTimeout: vi.fn(waitForTimeout),
  };
}

test('verifies analytics from browser-observed requests instead of bundle text', async () => {
  const withPage = (run: (page: VerifyPage) => Promise<void>) =>
    run(pageThatRequests('https://static.cloudflareinsights.com/beacon.min.js'));

  await expect(
    verifyDeployment(
      'https://labs.lasvegasfortransit.org',
      'labs.lasvegasfortransit.org',
      'present',
      withPage,
    ),
  ).resolves.toBeUndefined();
});

test('fails when the built client exists but the runtime gate sends no request', async () => {
  const withPage = (run: (page: VerifyPage) => Promise<void>) => run(pageThatRequests());

  await expect(
    verifyDeployment(
      'https://labs.lasvegasfortransit.org',
      'labs.lasvegasfortransit.org',
      'present',
      withPage,
    ),
  ).rejects.toThrow('browser made 0 Cloudflare beacon requests');
});

test('does not accept a collector event as proof that Web Analytics loaded', async () => {
  const withPage = (run: (page: VerifyPage) => Promise<void>) =>
    run(pageThatRequests('https://events.lasvegasfortransit.org/e'));

  await expect(
    verifyDeployment(
      'https://labs.lasvegasfortransit.org',
      'labs.lasvegasfortransit.org',
      'present',
      withPage,
    ),
  ).rejects.toThrow('browser made 0 Cloudflare beacon requests');
});

test('requires the expected site to match a production deployment hostname', async () => {
  const withPage = (run: (page: VerifyPage) => Promise<void>) =>
    run(pageThatRequests('https://static.cloudflareinsights.com/beacon.min.js'));

  await expect(
    verifyDeployment(
      'https://labs.lasvegasfortransit.org',
      'map.lasvegasfortransit.org',
      'present',
      withPage,
    ),
  ).rejects.toThrow('does not match expected site');
});

test('verifies excluded deployments by observing no analytics requests', async () => {
  const withPage = (run: (page: VerifyPage) => Promise<void>) => run(pageThatRequests());

  await expect(
    verifyDeployment('https://preview.example', 'labs.lasvegasfortransit.org', 'absent', withPage),
  ).resolves.toBeUndefined();
});
