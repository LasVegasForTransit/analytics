import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';

// The standalone client carries the client half of the event allowlist so a
// plain-HTML page rejects undeclared data before it leaves the browser. The
// allowlist grows with each site, so its budget covers five sites' events.
const budgets = [
  ['standalone client', 'dist/standalone/client.iife.js', 1792],
  ['package entry', 'dist/index.mjs', 1536],
];

for (const [name, path, maximum] of budgets) {
  const size = gzipSync(await readFile(path)).byteLength;
  if (size > maximum) throw new Error(`${name} is ${size} B gzip; the budget is ${maximum} B.`);
  console.log(`${name}: ${size}/${maximum} B gzip`);
}
