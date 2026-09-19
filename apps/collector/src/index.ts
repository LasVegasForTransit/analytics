import { dataPoint } from './columns.js';
import { siteForOrigin, withCors } from './cors.js';
import { validateEvent } from './validate.js';

const MAX_BODY_BYTES = 1024;

type CollectorEnv = Env & { LVBT_EVENTS_SECRET?: string };

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function response(status: number, message?: string) {
  return new Response(message, {
    ...(message ? { headers: { 'Content-Type': 'text/plain; charset=utf-8' } } : {}),
    status,
  });
}

async function readLimitedBody(request: Request) {
  const declaredLength = Number(request.headers.get('Content-Length') ?? 0);
  if (declaredLength > MAX_BODY_BYTES) throw new HttpError(413, 'Request body is too large.');
  if (!request.body) return '';
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let body = '';
  for (;;) {
    const { done, value } = (await reader.read()) as ReadableStreamReadResult<Uint8Array>;
    if (done) return body + decoder.decode();
    bytes += value.byteLength;
    if (bytes > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new HttpError(413, 'Request body is too large.');
    }
    body += decoder.decode(value, { stream: true });
  }
}

async function authorized(header: string | null, secret: string) {
  const candidate = header?.startsWith('Bearer ') ? header.slice(7) : '';
  const encoder = new TextEncoder();
  const [candidateHash, secretHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(candidate)),
    crypto.subtle.digest('SHA-256', encoder.encode(secret)),
  ]);
  return crypto.subtle.timingSafeEqual(candidateHash, secretHash);
}

async function rateLimitKey(request: Request, site: string) {
  const day = new Date().toISOString().slice(0, 10);
  const address = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${day}:${site}:${address}`),
  );
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function deviceFor(request: Request, source: 'client' | 'server') {
  if (source === 'server') return 'server';
  const mobile = request.headers.get('Sec-CH-UA-Mobile');
  if (mobile === '?1') return 'mobile';
  if (mobile === '?0') return 'desktop';
  return 'unknown';
}

function hasPrivacySignal(request: Request) {
  return request.headers.get('Sec-GPC') === '1' || request.headers.get('DNT') === '1';
}

async function sourceFor(request: Request, env: CollectorEnv): Promise<'client' | 'server'> {
  const authorization = request.headers.get('Authorization');
  if (!authorization) return 'client';
  if (
    !env.LVBT_EVENTS_SECRET ||
    !/^[a-f0-9]{64}$/.test(env.LVBT_EVENTS_SECRET) ||
    !(await authorized(authorization, env.LVBT_EVENTS_SECRET))
  )
    throw new HttpError(401, 'Authentication failed.');
  return 'server';
}

async function parseEvent(request: Request, source: 'client' | 'server') {
  try {
    return validateEvent(JSON.parse(await readLimitedBody(request)), source);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, 'Event does not match the allowlist.');
  }
}

async function collect(request: Request, env: CollectorEnv) {
  if (hasPrivacySignal(request)) return response(204);
  const source = await sourceFor(request, env);

  const origin = request.headers.get('Origin');
  const originSite = siteForOrigin(origin);
  if (source === 'client' && !originSite) throw new HttpError(403, 'Origin is not permitted.');
  const event = await parseEvent(request, source);
  if (source === 'client' && originSite !== event.site)
    throw new HttpError(403, 'Origin does not match the event site.');

  if (source === 'client') {
    const outcome = await env.EVENT_LIMITER.limit({ key: await rateLimitKey(request, event.site) });
    if (!outcome.success) throw new HttpError(429, 'Rate limit exceeded.');
  }

  env.EVENTS.writeDataPoint(
    dataPoint(event, {
      country:
        event.country ?? (typeof request.cf?.country === 'string' ? request.cf.country : 'unknown'),
      device: deviceFor(request, source),
      source,
    }),
  );
  return withCors(response(204), origin);
}

export async function handle(request: Request, env: CollectorEnv) {
  const url = new URL(request.url);
  if (url.pathname === '/health' && request.method === 'GET') return response(200, 'ok');
  if (url.pathname !== '/e') return response(404, 'Not found.');
  if (request.method === 'OPTIONS') {
    const origin = request.headers.get('Origin');
    if (!siteForOrigin(origin)) return response(403, 'Origin is not permitted.');
    return withCors(response(204), origin);
  }
  if (request.method !== 'POST') return response(405, 'Method not allowed.');
  try {
    return await collect(request, env);
  } catch (error) {
    if (error instanceof HttpError)
      return withCors(response(error.status, error.message), request.headers.get('Origin'));
    console.error(
      JSON.stringify({
        event: 'collector_error',
        message: error instanceof Error ? error.message : String(error),
      }),
    );
    return response(500, 'Internal error.');
  }
}

export default {
  fetch(request, env) {
    return handle(request, env);
  },
} satisfies ExportedHandler<CollectorEnv>;
