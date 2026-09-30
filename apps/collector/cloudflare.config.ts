import { bindings, defineConfig } from 'cf/config';

export default defineConfig({
  accountId: '2557b5c2e166292ded0f8425b73075e9',
  worker: {
    name: 'lvbt-analytics-events',
    compatibilityDate: '2026-08-22',
    compatibilityFlags: ['nodejs_compat'],
    entrypoint: 'src/index.ts',
    workersDev: false,
    observability: {
      enabled: true,
      headSamplingRate: 1,
    },
    domains: ['events.lasvegasfortransit.org'],
    env: {
      EVENTS: bindings.analyticsEngineDataset({ name: 'lvbt_events' }),
      EVENT_LIMITER: bindings.rateLimit({
        namespace: '1001',
        simple: { limit: 30, period: 60 },
      }),
      LVBT_EVENTS_SECRET: bindings.secret(),
    },
  },
});
