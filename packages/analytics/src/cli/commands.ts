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

export interface WriteCspResult {
  changed: boolean;
}

export async function writeCsp(path: string): Promise<WriteCspResult> {
  const contents = await readFile(path, 'utf8');
  const pattern = /^(\s*Content-Security-Policy:\s*)(.+)$/gim;
  if (!pattern.test(contents))
    throw new Error(`No Content-Security-Policy header was found in ${path}.`);
  pattern.lastIndex = 0;
  const updated = contents.replace(pattern, (_line, prefix: string, policy: string) => {
    return `${prefix}${csp.merge(policy)}`;
  });
  if (updated === contents) return { changed: false };
  await writeFile(path, updated);
  return { changed: true };
}

export async function writeClient(path: string) {
  const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  await writeFile(path, await readFile(resolve(packageDirectory, 'standalone/client.iife.js')));
}

interface VerifyRoute {
  continue(): Promise<unknown>;
  fulfill(options: { body?: string; contentType?: string; status: number }): Promise<unknown>;
  request(): { postData(): string | null; url(): string };
}

export interface VerifyPage {
  getAttribute(selector: string, name: string): Promise<string | null>;
  goto(url: string, options?: { waitUntil?: 'load' }): Promise<unknown>;
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
  const scriptRequests: string[] = [];
  const beaconRequests: string[] = [];
  const eventRequests: string[] = [];
  const eventSites: string[] = [];
  await withPage(async (page) => {
    await page.route('https://static.cloudflareinsights.com/**', async (route) => {
      scriptRequests.push(route.request().url());
      return route.continue();
    });
    await page.route('https://cloudflareinsights.com/**', async (route) => {
      beaconRequests.push(route.request().url());
      return route.fulfill({ status: 204 });
    });
    await page.route('https://events.lasvegasfortransit.org/**', async (route) => {
      const request = route.request();
      eventRequests.push(request.url());
      const body = request.postData();
      if (body) {
        try {
          const payload = JSON.parse(body) as { site?: unknown };
          if (typeof payload.site === 'string') eventSites.push(payload.site);
        } catch {
          // The collector owns full payload validation; deployment verification only checks site.
        }
      }
      return route.fulfill({ status: 204 });
    });
    await page.goto(pageUrl.href, { waitUntil: 'load' });
    await page.waitForTimeout(500);
    if (expect === 'present') {
      const configuredSite = await page.getAttribute('[data-lvbt-analytics]', 'data-lvbt-site');
      if (configuredSite !== site)
        throw new Error(
          `Expected analytics site ${site} at ${pageUrl.href}; the deployed client declared ${configuredSite ?? 'no site'}.`,
        );
    }
  });
  const wrongSite = eventSites.find((eventSite) => eventSite !== site);
  if (wrongSite)
    throw new Error(
      `Expected collector requests for ${site} at ${pageUrl.href}; observed a collector request for ${wrongSite}.`,
    );
  if (expect === 'present' && scriptRequests.length !== 1)
    throw new Error(
      `Expected analytics to be present for ${site} at ${pageUrl.href}; the browser made ${scriptRequests.length} Cloudflare script requests.`,
    );
  if (expect === 'present' && beaconRequests.length !== 1)
    throw new Error(
      `Expected analytics to be present for ${site} at ${pageUrl.href}; the browser made ${beaconRequests.length} Cloudflare Web Analytics beacon requests.`,
    );
  if (
    expect === 'absent' &&
    scriptRequests.length + beaconRequests.length + eventRequests.length !== 0
  )
    throw new Error(
      `Expected analytics to be absent for ${site} at ${pageUrl.href}; the browser made ${scriptRequests.length} Cloudflare script requests, ${beaconRequests.length} Cloudflare Web Analytics beacon requests, and ${eventRequests.length} collector requests.`,
    );
}
