import { describe, expect, test } from 'vitest';
import { clientEvent } from '../src/client-events.js';
import { eventPayload, EVENTS } from '../src/events.js';

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

  test.each([
    { name: 'campaign_signup', props: {} },
    { name: 'week_link_requested', props: { method: 'link_form' } },
    { name: 'trip_entry_submitted', props: { day: '3', method: 'screenshot' } },
    { name: 'trip_picture_shared', props: { method: 'share_sheet' } },
    { name: 'bingo_square_marked', props: { marked: '24' } },
    { name: 'bingo_completed', props: { lines: '12' } },
    { name: 'bus_finder_used', props: { method: 'place' } },
    { name: 'app_installed', props: { method: 'home_screen' } },
    { name: 'material_printed', props: { item: 'partner_flyer' } },
    { name: 'mail_in_viewed', props: {} },
  ])('accepts the lvwwd.org campaign event $name', (event) => {
    const payload = { site: 'lvwwd.org', ...event };
    expect(eventPayload(payload)).toEqual(payload);
  });

  test.each([
    { name: 'trip_entry_submitted', props: { day: '9', method: 'link' } },
    { name: 'trip_entry_submitted', props: { day: '2' } },
    {
      name: 'trip_entry_submitted',
      props: { day: '2', method: 'https://www.instagram.com/p/example' },
    },
    { name: 'campaign_signup', props: { contact: 'person@example.com' } },
    { name: 'bingo_square_marked', props: { marked: '25' } },
  ])('rejects campaign data outside the allowlist', (event) => {
    expect(() => eventPayload({ site: 'lvwwd.org', ...event })).toThrow();
  });

  test('declares lvwwd.org events for lvwwd.org alone', () => {
    const campaignEvents = Object.values(EVENTS).filter((event) =>
      (event.sites as readonly string[]).includes('lvwwd.org'),
    );
    expect(campaignEvents.length).toBeGreaterThan(0);
    for (const event of campaignEvents) expect(event.sites).toEqual(['lvwwd.org']);
  });

  test('keeps every property value a short enum label', () => {
    for (const event of Object.values(EVENTS))
      for (const values of Object.values(event.props) as Array<readonly string[]>)
        for (const value of values) expect(value).toMatch(/^[a-z0-9_]{1,32}$/);
  });

  test('refuses to send a server-only event from the browser', () => {
    expect(() => clientEvent('lasvegasfortransit.org', 'membership_intake', {} as never)).toThrow();
  });
});
