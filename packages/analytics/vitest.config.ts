import { defineConfig } from 'vitest/config';
import { sharedConfig } from '@lasvegasfortransit/vitest-config';

export default defineConfig({
  ...sharedConfig,
  test: {
    ...sharedConfig.test,
    environment: 'happy-dom',
    environmentOptions: { happyDOM: { url: 'https://test.example/' } },
    include: ['tests/**/*.test.ts'],
  },
});
