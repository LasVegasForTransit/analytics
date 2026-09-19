import { afterEach, expect, test, vi } from 'vitest';
import { init, resetForTesting } from '../src/init.js';

const sendBeaconDescriptor = Object.getOwnPropertyDescriptor(navigator, 'sendBeacon');

afterEach(() => {
  resetForTesting();
  vi.restoreAllMocks();
  if (sendBeaconDescriptor) Object.defineProperty(navigator, 'sendBeacon', sendBeaconDescriptor);
  else Reflect.deleteProperty(navigator, 'sendBeacon');
});

test('uses the collector fetch fallback when sendBeacon is unavailable', () => {
  Object.defineProperty(navigator, 'sendBeacon', { configurable: true, value: undefined });
  Object.defineProperty(navigator, 'globalPrivacyControl', { configurable: true, value: false });
  Object.defineProperty(navigator, 'doNotTrack', { configurable: true, value: '0' });
  vi.spyOn(document.head, 'append').mockImplementation(() => undefined);
  const fetch = vi.spyOn(window, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));

  const analytics = init({
    site: 'test.example',
    token: 'a'.repeat(32),
    noPageviews: [/^\/private/],
  });
  analytics.track('join_click', { placement: 'header' });

  expect(fetch).toHaveBeenCalledWith(
    'https://events.lasvegasfortransit.org/e',
    expect.objectContaining({ keepalive: true, method: 'POST' }),
  );
});
