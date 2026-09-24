import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path, { resolve } from 'node:path';
import { expect, test, vi } from 'vitest';
import {
  eventsMarkdown,
  verifyDeployment,
  writeCsp,
  type VerifyPage,
} from '../src/cli/commands.js';

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

function pageThatRequests(...requests: Array<string | { body: string; url: string }>): VerifyPage {
  const routes: Array<{
    pattern: string;
    handler: (route: {
      continue(): Promise<void>;
      fulfill(options: { body?: string; contentType?: string; status: number }): Promise<void>;
      request(): { postData(): string | null; url(): string };
    }) => Promise<unknown>;
  }> = [];
  const goto: VerifyPage['goto'] = async () => {
    for (const request of requests) {
      const { body, url } = typeof request === 'string' ? { body: null, url: request } : request;
      const route = routes.find(({ pattern }) =>
        pattern.endsWith('/**') ? url.startsWith(pattern.slice(0, -2)) : url === pattern,
      );
      await route?.handler({
        continue: () => Promise.resolve(),
        fulfill: () => Promise.resolve(),
        request: () => ({ postData: () => body, url: () => url }),
      });
    }
  };
  const route: VerifyPage['route'] = (pattern, handler) => {
    routes.push({ handler, pattern });
    return Promise.resolve();
  };
  const waitForTimeout: VerifyPage['waitForTimeout'] = () => Promise.resolve();
  const getAttribute: VerifyPage['getAttribute'] = (_selector, name) =>
    Promise.resolve(name === 'data-lvbt-site' ? 'labs.lasvegasfortransit.org' : null);
  return {
    getAttribute: vi.fn(getAttribute),
    goto: vi.fn(goto),
    route: vi.fn(route),
    waitForTimeout: vi.fn(waitForTimeout),
  };
}

test('verifies analytics from browser-observed requests instead of bundle text', async () => {
  const withPage = (run: (page: VerifyPage) => Promise<void>) =>
    run(
      pageThatRequests(
        'https://static.cloudflareinsights.com/beacon.min.js',
        'https://cloudflareinsights.com/cdn-cgi/rum',
      ),
    );

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
  ).rejects.toThrow('browser made 0 Cloudflare script requests');
});

test('does not accept the script download as proof that Web Analytics sent a beacon', async () => {
  const withPage = (run: (page: VerifyPage) => Promise<void>) =>
    run(pageThatRequests('https://static.cloudflareinsights.com/beacon.min.js'));

  await expect(
    verifyDeployment(
      'https://labs.lasvegasfortransit.org',
      'labs.lasvegasfortransit.org',
      'present',
      withPage,
    ),
  ).rejects.toThrow('browser made 0 Cloudflare Web Analytics beacon requests');
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
  ).rejects.toThrow('browser made 0 Cloudflare script requests');
});

test('rejects collector events attributed to a different production site', async () => {
  const withPage = (run: (page: VerifyPage) => Promise<void>) =>
    run(
      pageThatRequests(
        'https://static.cloudflareinsights.com/beacon.min.js',
        'https://cloudflareinsights.com/cdn-cgi/rum',
        {
          body: JSON.stringify({
            name: 'join_click',
            props: { placement: 'header' },
            site: 'map.lasvegasfortransit.org',
          }),
          url: 'https://events.lasvegasfortransit.org/e',
        },
      ),
    );

  await expect(
    verifyDeployment(
      'https://labs.lasvegasfortransit.org',
      'labs.lasvegasfortransit.org',
      'present',
      withPage,
    ),
  ).rejects.toThrow('collector request for map.lasvegasfortransit.org');
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

test('writes the merged CSP once; a second run leaves the file untouched', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'lvbt-analytics-csp-'));
  const file = path.join(directory, '_headers');
  await writeFile(file, "/*\n  Content-Security-Policy: default-src 'self'; object-src 'none'\n");

  const first = await writeCsp(file);
  expect(first.changed).toBe(true);
  const contentsAfterFirst = await readFile(file, 'utf8');
  expect(contentsAfterFirst).toContain('https://static.cloudflareinsights.com');
  expect(contentsAfterFirst).toContain('https://events.lasvegasfortransit.org');
  const mtimeAfterFirst = (await stat(file)).mtimeMs;

  // A real filesystem's mtime resolution can be coarser than the gap between
  // these two writes, so wait past it — otherwise an unwanted second write
  // could coincidentally land on the same tick and hide as "unchanged".
  await new Promise((resolveTimeout) => setTimeout(resolveTimeout, 20));

  const second = await writeCsp(file);
  expect(second.changed).toBe(false);
  const contentsAfterSecond = await readFile(file, 'utf8');
  const mtimeAfterSecond = (await stat(file)).mtimeMs;

  expect(contentsAfterSecond).toBe(contentsAfterFirst);
  expect(mtimeAfterSecond).toBe(mtimeAfterFirst);
});

test('rejects a headers file with no Content-Security-Policy header', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'lvbt-analytics-csp-'));
  const file = path.join(directory, '_headers');
  await writeFile(file, '/*\n  X-Content-Type-Options: nosniff\n');

  await expect(writeCsp(file)).rejects.toThrow('No Content-Security-Policy header was found');
});
