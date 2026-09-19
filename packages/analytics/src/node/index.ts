import { readFile } from 'node:fs/promises';
import { csp } from '../csp.js';

export async function checkHeadersFile(path: string, collector?: string): Promise<string[]> {
  const contents = await readFile(path, 'utf8');
  const headerPattern = /^\s*Content-Security-Policy:\s*(.+)$/i;
  const policies = contents
    .split(/\r?\n/)
    .map((line) => headerPattern.exec(line)?.[1])
    .filter((value): value is string => Boolean(value));
  if (policies.length === 0) return ['No Content-Security-Policy header was found.'];
  return policies.flatMap((policy) => csp.check(policy, collector));
}
