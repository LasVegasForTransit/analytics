import { defineConfig } from 'tsdown';

export default defineConfig({
  clean: false,
  deps: { neverBundle: true },
  dts: false,
  entry: { client: 'src/standalone.ts' },
  format: 'iife',
  minify: true,
  outDir: 'dist/standalone',
  outputOptions: { codeSplitting: false },
});
