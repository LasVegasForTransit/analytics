import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csp } from '../csp.js';
import { EVENTS } from '../events.js';
import { checkHeadersFile } from '../node/index.js';

export function eventsMarkdown() {
  const rows = Object.entries(EVENTS).map(([name, event]) => {
    const props = (Object.entries(event.props) as Array<[string, readonly string[]]>)
      .map(([key, values]) => `\`${key}\`: ${values.map((value) => `\`${value}\``).join(', ')}`)
      .join('<br>');
    const sites = event.sites.map((site) => `\`${site}\``).join('<br>');
    return `| \`${name}\` | ${event.source} | ${sites} | ${props || 'None'} |`;
  });
  return ['| Event | Source | Sites | Properties |', '| --- | --- | --- | --- |', ...rows, ''].join(
    '\n',
  );
}

export async function checkCsp(path: string) {
  return checkHeadersFile(path);
}

export async function writeCsp(path: string) {
  const contents = await readFile(path, 'utf8');
  const pattern = /^(\s*Content-Security-Policy:\s*)(.+)$/gim;
  if (!pattern.test(contents))
    throw new Error(`No Content-Security-Policy header was found in ${path}.`);
  pattern.lastIndex = 0;
  const updated = contents.replace(pattern, (_line, prefix: string, policy: string) => {
    return `${prefix}${csp.merge(policy)}`;
  });
  await writeFile(path, updated);
}

export async function writeClient(path: string) {
  const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  await writeFile(path, await readFile(resolve(packageDirectory, 'standalone/client.iife.js')));
}

interface VerifyRoute {
  fulfill(options: { body?: string; contentType?: string; status: number }): Promise<unknown>;
  request(): { url(): string };
}

export interface VerifyPage {
  goto(url: string, options?: { waitUntil?: 'domcontentloaded' }): Promise<unknown>;
  route(pattern: string, handler: (route: VerifyRoute) => Promise<unknown>): Promise<unknown>;
  waitForTimeout(milliseconds: number): Promise<unknown>;
}

export type WithVerifyPage = (run: (page: VerifyPage) => Promise<void>) => Promise<void>;

async function loadPlaywright() {
  try {
    return await import('@playwright/test');
  } catch {
    throw new Error('Deployment verification requires @playwright/test and its Chromium browser.');
  }
}

const withChromium: WithVerifyPage = async (run) => {
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  try {
    await run(await browser.newPage());
  } finally {
    await browser.close();
  }
};

export async function verifyDeployment(
  url: string,
  site: string,
  expect: 'present' | 'absent',
  withPage: WithVerifyPage = withChromium,
) {
  const pageUrl = new URL(url);
  if (expect === 'present' && pageUrl.hostname !== site && pageUrl.hostname !== `www.${site}`)
    throw new Error(`${pageUrl.hostname} does not match expected site ${site}.`);
  const beaconRequests: string[] = [];
  const eventRequests: string[] = [];
  await withPage(async (page) => {
    await page.route('https://static.cloudflareinsights.com/**', async (route) => {
      beaconRequests.push(route.request().url());
      return route.fulfill({ body: 'export {};', contentType: 'text/javascript', status: 200 });
    });
    await page.route('https://events.lasvegasfortransit.org/**', async (route) => {
      eventRequests.push(route.request().url());
      return route.fulfill({ status: 204 });
    });
    await page.goto(pageUrl.href, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
  });
  if (expect === 'present' && beaconRequests.length !== 1)
    throw new Error(
      `Expected analytics to be present for ${site} at ${pageUrl.href}; the browser made ${beaconRequests.length} Cloudflare beacon requests.`,
    );
  if (expect === 'absent' && beaconRequests.length + eventRequests.length !== 0)
    throw new Error(
      `Expected analytics to be absent for ${site} at ${pageUrl.href}; the browser made ${beaconRequests.length} Cloudflare beacon requests and ${eventRequests.length} collector requests.`,
    );
}
