import { EVENTS } from '@lasvegasfortransit/analytics';

const sites = new Set<string>(Object.values(EVENTS).flatMap((event) => event.sites));

export function siteForOrigin(origin: string | null) {
  if (!origin) return undefined;
  try {
    const url = new URL(origin);
    if (url.protocol !== 'https:' || url.port) return undefined;
    const site = url.hostname.startsWith('www.') ? url.hostname.slice(4) : url.hostname;
    return sites.has(site) ? site : undefined;
  } catch {
    return undefined;
  }
}

export function withCors(response: Response, origin: string | null) {
  if (!siteForOrigin(origin)) return response;
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', origin ?? '');
  headers.set('Vary', 'Origin');
  return new Response(response.body, { headers, status: response.status });
}
