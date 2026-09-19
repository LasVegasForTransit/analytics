import { expect, test } from 'vitest';
import { csp } from '../src/csp.js';

test('adds analytics origins once without weakening existing directives', () => {
  const original = "default-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'";
  const merged = csp.merge(original);
  expect(merged).toContain("script-src 'self' https://static.cloudflareinsights.com");
  expect(merged).toContain(
    "connect-src 'self' https://cloudflareinsights.com https://events.lasvegasfortransit.org",
  );
  expect(merged).toContain("object-src 'none'");
  expect(csp.merge(merged)).toBe(merged);
  expect(csp.check(merged)).toEqual([]);
});

test('preserves default-src values when creating specific directives', () => {
  const merged = csp.merge("default-src 'self' https://assets.example; object-src 'none'");

  expect(merged).toContain(
    "script-src 'self' https://assets.example https://static.cloudflareinsights.com",
  );
  expect(merged).toContain(
    "connect-src 'self' https://assets.example https://cloudflareinsights.com https://events.lasvegasfortransit.org",
  );
});
