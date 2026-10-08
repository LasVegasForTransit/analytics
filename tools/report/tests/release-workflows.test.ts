import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const workflows = fileURLToPath(new URL('../../../.github/workflows/', import.meta.url));

test('collector recovery selects an immutable staging release and forwards the explicit production version guard', async () => {
  const promotion = await readFile(`${workflows}/promote-collector.yml`, 'utf8');
  expect(promotion).toMatch(/expected_version:\s*\n\s+description:/u);
  expect(promotion).toContain('expected-version: ${{ inputs.expected_version }}');
  expect(promotion).toContain('release-source.yml@');
  expect(promotion).toContain('release-publish.yml@');
  expect(promotion).toContain('run-id: ${{ inputs.run_id }}');
  expect(promotion).toContain('release-id: ${{ needs.source.outputs.release-id }}');
  expect(promotion).toContain('commit: ${{ needs.source.outputs.commit }}');
  expect(promotion).toContain('production-environment: production');
  expect(promotion).toContain("if: github.ref == 'refs/heads/main'");
  for (const file of (await readdir(workflows)).filter((name) => /collector.*\.yml$/u.test(name))) {
    const workflow = await readFile(`${workflows}/${file}`, 'utf8');
    expect(workflow, file).not.toMatch(/run:\s*(?:pnpm\s+(?:run\s+)?deploy|.*cf\s+deploy)/u);
  }
});
