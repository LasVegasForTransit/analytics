import { defineConfig } from '@playwright/test';
import { serveAsProduction } from './src/playwright.js';

const production = serveAsProduction('http://127.0.0.1:4174', 'analytics.test');

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: production.url,
    launchOptions: { args: production.chromiumArgs },
  },
  webServer: {
    command: 'vite --config fixtures/browser/vite.config.ts',
    reuseExistingServer: false,
    url: 'http://127.0.0.1:4174',
  },
});
