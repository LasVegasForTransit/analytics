import { describe, expect, test } from 'vitest';
import { shouldEnable } from '../src/gate.js';

const enabled = {
  site: 'labs.lasvegasfortransit.org',
  hostname: 'labs.lasvegasfortransit.org',
  token: 'a'.repeat(32),
};

describe('analytics privacy gate', () => {
  test.each([
    [{ token: '' }, 'no-token'],
    [{ gpc: true }, 'gpc'],
    [{ dnt: true }, 'dnt'],
    [{ framed: true }, 'framed'],
    [{ pathname: '/private', exclude: [/^\/private/] }, 'excluded-path'],
    [{ hostname: 'localhost' }, 'localhost'],
    [{ hostname: 'preview.pages.dev' }, 'preview-host'],
    [{ hostname: 'version.worker.workers.dev' }, 'preview-host'],
    [{ hostname: 'lasvegasfortransit.org' }, 'hostname-mismatch'],
  ])('rejects %o as %s', (overrides, reason) => {
    expect(shouldEnable({ ...enabled, ...overrides })).toEqual({ enabled: false, reason });
  });

  test('accepts the exact production hostname', () => {
    expect(shouldEnable(enabled)).toEqual({ enabled: true });
  });

  test('applies stateful exclusion expressions consistently', () => {
    const input = { ...enabled, pathname: '/private', exclude: [/^\/private/g] };

    expect(shouldEnable(input)).toEqual({ enabled: false, reason: 'excluded-path' });
    expect(shouldEnable(input)).toEqual({ enabled: false, reason: 'excluded-path' });
  });
});
