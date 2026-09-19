import { beforeEach, expect, test, vi } from 'vitest';
import { init, resetForTesting } from '../src/init.js';

beforeEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(navigator, 'globalPrivacyControl', { configurable: true, value: false });
  Object.defineProperty(navigator, 'doNotTrack', { configurable: true, value: '0' });
  document.head.replaceChildren();
  document.body.replaceChildren();
  history.replaceState({}, '', '/');
  resetForTesting();
});

test('initializes once and sends allowlisted events without browser storage', () => {
  const sendBeacon = vi.fn(() => true);
  Object.defineProperty(navigator, 'sendBeacon', { configurable: true, value: sendBeacon });
  const append = vi.spyOn(document.head, 'append').mockImplementation(() => undefined);
  const localStorageWrite = vi.spyOn(window.Storage.prototype, 'setItem');

  const first = init({ site: 'test.example', token: 'a'.repeat(32) });
  const second = init({ site: 'test.example', token: 'a'.repeat(32) });

  expect(first.enabled).toBe(true);
  expect(second.enabled).toBe(true);
  expect(append).toHaveBeenCalledTimes(1);
  expect(append.mock.calls[0]?.[0]).toMatchObject({
    defer: true,
    src: 'https://static.cloudflareinsights.com/beacon.min.js',
    type: 'module',
  });
  first.track('join_click', { placement: 'header' });
  first.track('join_click', { placement: 'header' });
  expect(sendBeacon).toHaveBeenCalledTimes(1);
  expect(localStorageWrite).not.toHaveBeenCalled();
  append.mockRestore();
  localStorageWrite.mockRestore();
});

test('does nothing when privacy signals disable analytics', () => {
  Object.defineProperty(navigator, 'globalPrivacyControl', { configurable: true, value: true });
  const result = init({
    site: 'test.example',
    token: 'a'.repeat(32),
  });
  expect(result).toMatchObject({ enabled: false, reason: 'gpc' });
  expect(document.querySelector('[data-lvbt-analytics]')).toBeNull();
});

test('ignores malformed delegated event attributes', () => {
  vi.spyOn(document.head, 'append').mockImplementation(() => undefined);
  const sendBeacon = vi.fn(() => true);
  Object.defineProperty(navigator, 'sendBeacon', { configurable: true, value: sendBeacon });
  init({ site: 'test.example', token: 'a'.repeat(32) });
  const link = document.createElement('a');
  link.dataset.lvbtEvent = 'join_click';
  link.dataset.lvbtPlacement = 'sidebar';
  document.body.append(link);

  expect(() => link.click()).not.toThrow();
  expect(sendBeacon).not.toHaveBeenCalled();
});

test('tracks a valid delegated event from a nested click target', () => {
  vi.spyOn(document.head, 'append').mockImplementation(() => undefined);
  const sendBeacon = vi.fn(() => true);
  Object.defineProperty(navigator, 'sendBeacon', { configurable: true, value: sendBeacon });
  init({ site: 'test.example', token: 'a'.repeat(32) });
  const link = document.createElement('a');
  link.dataset.lvbtEvent = 'donate_click';
  link.dataset.lvbtPlacement = 'footer';
  const label = document.createElement('span');
  link.append(label);
  document.body.append(link);

  label.click();

  expect(sendBeacon).toHaveBeenCalledOnce();
});

test('falls back to keepalive fetch when sendBeacon declines the event', () => {
  vi.spyOn(document.head, 'append').mockImplementation(() => undefined);
  Object.defineProperty(navigator, 'sendBeacon', {
    configurable: true,
    value: vi.fn(() => false),
  });
  const fetch = vi.spyOn(window, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
  const analytics = init({
    site: 'test.example',
    token: 'a'.repeat(32),
  });

  analytics.track('join_click', { placement: 'header' });

  expect(fetch).toHaveBeenCalledWith(
    'https://events.lasvegasfortransit.org/e',
    expect.objectContaining({ method: 'POST', keepalive: true }),
  );
});

test('suppresses pageviews without disabling allowlisted events', () => {
  const append = vi.spyOn(document.head, 'append').mockImplementation(() => undefined);
  const sendBeacon = vi.fn(() => true);
  Object.defineProperty(navigator, 'sendBeacon', { configurable: true, value: sendBeacon });
  history.replaceState({}, '', '/private');
  const analytics = init({
    site: 'test.example',
    token: 'a'.repeat(32),
    noPageviews: [/^\/private/],
  });

  analytics.track('join_click', { placement: 'header' });

  expect(append).not.toHaveBeenCalled();
  expect(sendBeacon).toHaveBeenCalledOnce();
});

test('disables automatic SPA pageviews when path rules are configured', () => {
  const append = vi.spyOn(document.head, 'append').mockImplementation(() => undefined);
  init({
    site: 'test.example',
    token: 'a'.repeat(32),
    noPageviews: [/^\/private/],
  });

  const script = append.mock.calls[0]?.[0] as HTMLScriptElement;
  expect(JSON.parse(script.dataset.cfBeacon ?? '{}')).toMatchObject({ spa: false });
});

test('stops custom events after navigating to an excluded path', () => {
  vi.spyOn(document.head, 'append').mockImplementation(() => undefined);
  const sendBeacon = vi.fn(() => true);
  Object.defineProperty(navigator, 'sendBeacon', { configurable: true, value: sendBeacon });
  const analytics = init({
    site: 'test.example',
    token: 'a'.repeat(32),
    exclude: [/^\/private/],
  });

  history.pushState({}, '', '/private');
  analytics.track('join_click', { placement: 'header' });

  expect(sendBeacon).not.toHaveBeenCalled();
});
