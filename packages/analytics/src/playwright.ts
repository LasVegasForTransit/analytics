export interface CapturedRequest {
  body: string | null;
  url: string;
}

interface RequestLike {
  postData(): string | null;
  url(): string;
}

interface RouteLike {
  fulfill(response: {
    body?: string;
    contentType?: string;
    headers?: Record<string, string>;
    status: number;
  }): Promise<unknown>;
  request(): RequestLike;
}

interface PageLike {
  route(url: string, handler: (route: RouteLike) => Promise<unknown>): Promise<unknown>;
}

export function serveAsProduction(localOrigin: string, site: string) {
  const local = new URL(localOrigin);
  const url = new URL(localOrigin);
  url.hostname = site;
  return {
    chromiumArgs: [`--host-resolver-rules=MAP ${site} ${local.hostname}`],
    url: url.href,
  };
}

export async function captureBeacon(page: PageLike): Promise<CapturedRequest[]> {
  const requests: CapturedRequest[] = [];
  await page.route('https://static.cloudflareinsights.com/**', async (route) => {
    const request = route.request();
    requests.push({ body: request.postData(), url: request.url() });
    return route.fulfill({ body: 'export {};', contentType: 'text/javascript', status: 200 });
  });
  return requests;
}

export async function captureEvents(
  page: PageLike,
  collector = 'https://events.lasvegasfortransit.org',
): Promise<CapturedRequest[]> {
  const requests: CapturedRequest[] = [];
  await page.route(`${collector}/**`, async (route) => {
    const request = route.request();
    requests.push({ body: request.postData(), url: request.url() });
    return route.fulfill({
      headers: { 'access-control-allow-origin': '*' },
      status: 204,
    });
  });
  return requests;
}
