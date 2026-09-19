import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/client.ts',
    'src/react.tsx',
    'src/playwright.ts',
    'src/node/index.ts',
    'src/cli/index.ts',
  ],
  format: 'esm',
  dts: true,
  clean: true,
  deps: { neverBundle: ['astro', 'react', 'react/jsx-runtime'] },
});
