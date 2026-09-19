import { defineConfig } from 'vite';

export default defineConfig({
  root: new URL('.', import.meta.url).pathname,
  server: {
    allowedHosts: ['analytics.test'],
    host: '127.0.0.1',
    port: 4174,
    strictPort: true,
  },
});
