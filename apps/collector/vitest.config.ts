import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: { bindings: { LVBT_EVENTS_SECRET: 'a'.repeat(64) } },
    }),
  ],
  test: { include: ['tests/**/*.test.ts'] },
});
