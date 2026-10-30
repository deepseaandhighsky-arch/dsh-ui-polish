import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/client.ts'],
  outDir: 'lib',
  // The dsh client module table executes this bundle as a classic script:
  // a single self-contained IIFE with no import statements.
  format: 'iife',
  platform: 'browser',
  dts: false,
  minify: false,
  // Keep the canonical ./client export path (tsdown would add an .iife suffix).
  outExtensions: () => ({ js: '.js' }),
});
