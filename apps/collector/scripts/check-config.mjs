import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

import cloudflare from '../cloudflare.config.ts';

const source = await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8');
const parsed = ts.parseConfigFileTextToJson('wrangler.jsonc', source);
assert.equal(parsed.error, undefined, 'Wrangler fallback must be valid JSONC');
const wrangler = parsed.config;
const worker = cloudflare.worker;

assert.equal(cloudflare.accountId, '2557b5c2e166292ded0f8425b73075e9');
assert.equal(worker.name, wrangler.name);
assert.equal(worker.entrypoint, wrangler.main);
assert.equal(worker.compatibilityDate, wrangler.compatibility_date);
assert.deepEqual(worker.compatibilityFlags, wrangler.compatibility_flags);
assert.equal(worker.workersDev, wrangler.workers_dev);
assert.deepEqual(worker.observability, {
  enabled: wrangler.observability.enabled,
  headSamplingRate: wrangler.observability.head_sampling_rate,
});
assert.deepEqual(
  worker.domains,
  wrangler.routes.filter((route) => route.custom_domain).map((route) => route.pattern),
);
assert.deepEqual(worker.env.EVENTS, {
  type: 'analytics-engine-dataset',
  name: wrangler.analytics_engine_datasets[0].dataset,
});
assert.equal(wrangler.analytics_engine_datasets[0].binding, 'EVENTS');
assert.deepEqual(worker.env.EVENT_LIMITER, {
  type: 'rate-limit',
  namespace: wrangler.ratelimits[0].namespace_id,
  simple: wrangler.ratelimits[0].simple,
});
assert.equal(wrangler.ratelimits[0].name, 'EVENT_LIMITER');
assert.deepEqual(worker.env.LVBT_EVENTS_SECRET, { type: 'secret' });

process.stdout.write('Cloudflare and Wrangler collector configurations match.\n');
