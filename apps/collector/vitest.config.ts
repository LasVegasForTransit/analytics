import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';
import { sharedConfig } from '@lasvegasfortransit/vitest-config';

export default defineConfig({
  ...sharedConfig,
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: { bindings: { LVBT_EVENTS_SECRET: 'a'.repeat(64) } },
    }),
  ],
  test: { ...sharedConfig.test, include: ['tests/**/*.test.ts'] },
});
