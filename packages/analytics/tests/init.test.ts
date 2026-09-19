import { beforeEach, expect, test, vi } from 'vitest';
import { init, resetForTesting } from '../src/init.js';

beforeEach(() => {
  resetForTesting();
  vi.restoreAllMocks();
  Object.defineProperty(navigator, 'globalPrivacyControl', { configurable: true, value: false });
  Object.defineProperty(navigator, 'doNotTrack', { configurable: true, value: '0' });
  document.head.replaceChildren();
  document.body.replaceChildren();
  history.replaceState({}, '', '/');
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
  vi.spyOn(XMLHttpRequest.prototype, 'open').mockImplementation(() => undefined);
  const send = vi.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(() => undefined);
  const sendBeacon = vi.fn(() => true);
  Object.defineProperty(navigator, 'sendBeacon', { configurable: true, value: sendBeacon });
  history.replaceState({}, '', '/private');
  const analytics = init({
    site: 'test.example',
    token: 'a'.repeat(32),
    noPageviews: [/^\/private/],
  });

  send.mockClear();
  const pageview = new XMLHttpRequest();
  pageview.open('POST', 'https://cloudflareinsights.com/cdn-cgi/rum');
  pageview.send(JSON.stringify({ location: 'https://test.example/private' }));
  analytics.track('join_click', { placement: 'header' });

  expect(append).toHaveBeenCalledOnce();
  expect(send).not.toHaveBeenCalled();
  expect(sendBeacon).toHaveBeenCalledOnce();
});

test('keeps automatic SPA pageviews enabled when path rules are configured', () => {
  const append = vi.spyOn(document.head, 'append').mockImplementation(() => undefined);
  init({
    site: 'test.example',
    token: 'a'.repeat(32),
    noPageviews: [/^\/private/],
  });

  const script = append.mock.calls[0]?.[0] as HTMLScriptElement;
  expect(JSON.parse(script.dataset.cfBeacon ?? '{}')).toMatchObject({ spa: true });
});

test('filters Cloudflare pageviews across initial and SPA route changes', () => {
  vi.spyOn(document.head, 'append').mockImplementation(() => undefined);
  const open = vi.spyOn(XMLHttpRequest.prototype, 'open').mockImplementation(() => undefined);
  const send = vi.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(() => undefined);
  const token = 'a'.repeat(32);

  init({
    site: 'test.example',
    token,
    exclude: [/^\/excluded/],
    noPageviews: [/^\/private/],
  });
  open.mockClear();
  send.mockClear();

  const sendPageview = (pathname: string) => {
    const body = JSON.stringify({ location: `https://test.example${pathname}`, siteToken: token });
    const request = new XMLHttpRequest();
    request.open('POST', 'https://cloudflareinsights.com/cdn-cgi/rum');
    request.send(body);
    return body;
  };

  const initialPageview = sendPageview('/');
  history.pushState({}, '', '/private/share');
  sendPageview('/private/share');
  history.replaceState({}, '', '/allowed');
  const allowedPageview = sendPageview('/allowed');
  history.pushState({}, '', '/excluded/archive');
  window.dispatchEvent(new PopStateEvent('popstate'));
  sendPageview('/excluded/archive');

  expect(send).toHaveBeenCalledTimes(2);
  expect(send).toHaveBeenNthCalledWith(1, initialPageview);
  expect(send).toHaveBeenNthCalledWith(2, allowedPageview);
});

test('recovers pageviews after starting on a no-pageviews route', () => {
  history.replaceState({}, '', '/private/start');
  const append = vi.spyOn(document.head, 'append').mockImplementation(() => undefined);
  const open = vi.spyOn(XMLHttpRequest.prototype, 'open').mockImplementation(() => undefined);
  const send = vi.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(() => undefined);

  init({
    site: 'test.example',
    token: 'a'.repeat(32),
    noPageviews: [/^\/private/],
  });
  const script = append.mock.calls[0]?.[0] as HTMLScriptElement;
  expect(JSON.parse(script.dataset.cfBeacon ?? '{}')).toMatchObject({ spa: true });
  open.mockClear();
  send.mockClear();

  const request = new XMLHttpRequest();
  request.open('POST', 'https://cloudflareinsights.com/cdn-cgi/rum');
  request.send(JSON.stringify({ location: 'https://test.example/private/start' }));
  history.pushState({}, '', '/allowed');
  request.open('POST', 'https://cloudflareinsights.com/cdn-cgi/rum');
  request.send(JSON.stringify({ location: 'https://test.example/allowed' }));

  expect(send).toHaveBeenCalledOnce();
});

test('does not load the beacon on an initially excluded route when SPA tracking is off', () => {
  history.replaceState({}, '', '/private/start');
  const append = vi.spyOn(document.head, 'append').mockImplementation(() => undefined);

  const analytics = init({
    site: 'test.example',
    token: 'a'.repeat(32),
    exclude: [/^\/private/],
    spa: false,
  });

  expect(analytics).toMatchObject({ enabled: false, reason: 'excluded-path' });
  expect(append).not.toHaveBeenCalled();
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
