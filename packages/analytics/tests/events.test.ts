import { describe, expect, test } from 'vitest';
import { eventPayload } from '../src/events.js';

describe('event allowlist', () => {
  test('accepts a declared event and enum property', () => {
    expect(
      eventPayload({
        site: 'labs.lasvegasfortransit.org',
        name: 'join_click',
        props: { placement: 'header' },
      }),
    ).toEqual({
      site: 'labs.lasvegasfortransit.org',
      name: 'join_click',
      props: { placement: 'header' },
    });
  });

  test.each([
    { site: 'labs.lasvegasfortransit.org', name: 'unknown', props: {} },
    { site: 'labs.lasvegasfortransit.org', name: 'join_click', props: { placement: 'sidebar' } },
    {
      site: 'labs.lasvegasfortransit.org',
      name: 'join_click',
      props: { placement: 'header', label: 'free text' },
    },
  ])('rejects undeclared event data', (payload) => {
    expect(() => eventPayload(payload)).toThrow();
  });
});
