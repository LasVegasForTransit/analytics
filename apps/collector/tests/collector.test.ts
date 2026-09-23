import { exports } from 'cloudflare:workers';
import { describe, expect, test, vi } from 'vitest';
import { handle } from '../src/index.js';

const endpoint = 'https://events.lasvegasfortransit.org/e';
const clientHeaders = {
  'Content-Type': 'text/plain',
  Origin: 'https://labs.lasvegasfortransit.org',
};
const clientEvent = JSON.stringify({
  site: 'labs.lasvegasfortransit.org',
  name: 'join_click',
  props: { placement: 'header' },
});
const serverSecret = 'a'.repeat(64);

function testEnv(rateLimitSuccess = true) {
  return {
    EVENTS: { writeDataPoint: vi.fn<(point: AnalyticsEngineDataPoint) => void>() },
    EVENT_LIMITER: { limit: vi.fn().mockResolvedValue({ success: rateLimitSuccess }) },
    LVBT_EVENTS_SECRET: serverSecret,
  };
}

function workerFetch(input: string, init?: RequestInit) {
  return exports.default.fetch(new Request(input, init));
}

describe('analytics collector', () => {
  test('reports health', async () => {
    const response = await workerFetch('https://events.lasvegasfortransit.org/health');
    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe('ok');
  });

  test('accepts a declared client event from its production origin', async () => {
    const response = await workerFetch(endpoint, {
      body: clientEvent,
      headers: clientHeaders,
      method: 'POST',
    });
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
      'https://labs.lasvegasfortransit.org',
    );
  });

  test('writes an lvwwd.org campaign event with its properties in declared order', async () => {
    const env = testEnv();
    const response = await handle(
      new Request(endpoint, {
        body: JSON.stringify({
          site: 'lvwwd.org',
          name: 'trip_entry_submitted',
          props: { method: 'screenshot', day: '5' },
        }),
        headers: { 'Content-Type': 'text/plain', Origin: 'https://lvwwd.org' },
        method: 'POST',
      }),
      env,
    );

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://lvwwd.org');
    expect(env.EVENTS.writeDataPoint).toHaveBeenCalledOnce();
    const point = env.EVENTS.writeDataPoint.mock.calls[0]?.[0];
    expect(point?.indexes).toEqual(['lvwwd.org']);
    expect(point?.blobs?.slice(0, 2)).toEqual(['lvwwd.org', 'trip_entry_submitted']);
    expect(point?.blobs?.slice(6)).toEqual(['5', 'screenshot']);
  });

  test('keeps LVBT events and campaign events on their own sites', async () => {
    const campaignJoin = await workerFetch(endpoint, {
      body: JSON.stringify({
        site: 'lvwwd.org',
        name: 'join_click',
        props: { placement: 'header' },
      }),
      headers: { 'Content-Type': 'text/plain', Origin: 'https://lvwwd.org' },
      method: 'POST',
    });
    const labsSignup = await workerFetch(endpoint, {
      body: JSON.stringify({
        site: 'labs.lasvegasfortransit.org',
        name: 'campaign_signup',
        props: {},
      }),
      headers: clientHeaders,
      method: 'POST',
    });

    expect(campaignJoin.status).toBe(400);
    expect(labsSignup.status).toBe(400);
  });

  test.each(['Sec-GPC', 'DNT'])('honors %s before processing the event', async (header) => {
    const response = await workerFetch(endpoint, {
      body: 'not json',
      headers: { ...clientHeaders, [header]: '1' },
      method: 'POST',
    });
    expect(response.status).toBe(204);
  });

  test.each(['Sec-GPC', 'DNT'])('does not write an event when %s is enabled', async (header) => {
    const env = testEnv();
    const response = await handle(
      new Request(endpoint, {
        body: clientEvent,
        headers: { ...clientHeaders, [header]: '1' },
        method: 'POST',
      }),
      env,
    );

    expect(response.status).toBe(204);
    expect(env.EVENTS.writeDataPoint).not.toHaveBeenCalled();
    expect(env.EVENT_LIMITER.limit).not.toHaveBeenCalled();
  });

  test('returns 429 without writing when the client rate limit is exhausted', async () => {
    const env = testEnv(false);
    const response = await handle(
      new Request(endpoint, {
        body: clientEvent,
        headers: clientHeaders,
        method: 'POST',
      }),
      env,
    );

    expect(response.status).toBe(429);
    expect(env.EVENTS.writeDataPoint).not.toHaveBeenCalled();
  });

  test('rejects an origin that does not match the event site', async () => {
    const response = await workerFetch(endpoint, {
      body: clientEvent,
      headers: { ...clientHeaders, Origin: 'https://lasvegasfortransit.org' },
      method: 'POST',
    });
    expect(response.status).toBe(403);
  });

  test('rejects unknown properties and values', async () => {
    const response = await workerFetch(endpoint, {
      body: JSON.stringify({
        site: 'labs.lasvegasfortransit.org',
        name: 'join_click',
        props: { placement: 'sidebar', label: 'free text' },
      }),
      headers: clientHeaders,
      method: 'POST',
    });
    expect(response.status).toBe(400);
  });

  test('rejects oversized request bodies before parsing', async () => {
    const response = await workerFetch(endpoint, {
      body: 'x'.repeat(1025),
      headers: clientHeaders,
      method: 'POST',
    });
    expect(response.status).toBe(413);
  });

  test('rejects a server event with invalid authentication', async () => {
    const response = await workerFetch(endpoint, {
      body: JSON.stringify({
        site: 'lasvegasfortransit.org',
        name: 'membership_intake',
        props: {},
      }),
      headers: { Authorization: 'Bearer wrong', 'Content-Type': 'text/plain' },
      method: 'POST',
    });
    expect(response.status).toBe(401);
  });

  test('fails closed when the server event secret is missing', async () => {
    const env = testEnv();
    Reflect.deleteProperty(env, 'LVBT_EVENTS_SECRET');
    const response = await handle(
      new Request(endpoint, {
        body: JSON.stringify({
          site: 'lasvegasfortransit.org',
          name: 'membership_intake',
          props: {},
        }),
        headers: { Authorization: 'Bearer ', 'Content-Type': 'text/plain' },
        method: 'POST',
      }),
      env,
    );

    expect(response.status).toBe(401);
    expect(env.EVENTS.writeDataPoint).not.toHaveBeenCalled();
  });

  test('accepts an authenticated server event', async () => {
    const response = await workerFetch(endpoint, {
      body: JSON.stringify({
        site: 'lasvegasfortransit.org',
        name: 'membership_intake',
        props: {},
      }),
      headers: { Authorization: `Bearer ${serverSecret}`, 'Content-Type': 'text/plain' },
      method: 'POST',
    });
    expect(response.status).toBe(204);
  });

  test('uses a validated country forwarded by an authenticated server event', async () => {
    const env = testEnv();
    const response = await handle(
      new Request(endpoint, {
        body: JSON.stringify({
          site: 'lasvegasfortransit.org',
          name: 'membership_intake',
          props: {},
          country: 'US',
        }),
        headers: {
          Authorization: `Bearer ${serverSecret}`,
          'Content-Type': 'text/plain',
        },
        method: 'POST',
      }),
      env,
    );

    expect(response.status).toBe(204);
    expect(env.EVENTS.writeDataPoint).toHaveBeenCalledOnce();
    expect(env.EVENTS.writeDataPoint.mock.calls[0]?.[0].blobs).toContain('US');
  });

  test('rejects a country supplied by a browser event', async () => {
    const env = testEnv();
    const response = await handle(
      new Request(endpoint, {
        body: JSON.stringify({
          ...JSON.parse(clientEvent),
          country: 'US',
        }),
        headers: clientHeaders,
        method: 'POST',
      }),
      env,
    );

    expect(response.status).toBe(400);
    expect(env.EVENTS.writeDataPoint).not.toHaveBeenCalled();
  });
});
