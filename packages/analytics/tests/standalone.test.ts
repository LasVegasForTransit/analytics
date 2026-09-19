import { beforeEach, expect, test, vi } from 'vitest';
import { startStandalone } from '../src/standalone-runtime.js';

beforeEach(() => {
  vi.restoreAllMocks();
  document.head.replaceChildren();
  document.body.replaceChildren();
  history.replaceState({}, '', '/');
  delete (window as Window & { lvbt?: unknown }).lvbt;
});

test('starts from classic script data attributes and exposes event tracking', () => {
  const append = vi.spyOn(document.head, 'append').mockImplementation(() => undefined);
  const sendBeacon = vi.fn(() => true);
  Object.defineProperty(navigator, 'sendBeacon', { configurable: true, value: sendBeacon });
  const script = document.createElement('script');
  script.dataset.lvbtSite = 'test.example';
  script.dataset.lvbtToken = 'a'.repeat(32);

  startStandalone(script, {
    hostname: 'test.example',
    gpc: false,
    dnt: false,
    framed: false,
  });
  const analytics = (window as Window & { lvbt?: { track: (...args: unknown[]) => void } }).lvbt;
  analytics?.track('join_click', { placement: 'header' });

  expect(append).toHaveBeenCalledOnce();
  expect(sendBeacon).toHaveBeenCalledOnce();
});

test('does not initialize when a privacy signal is enabled', () => {
  const script = document.createElement('script');
  script.dataset.lvbtSite = 'test.example';
  script.dataset.lvbtToken = 'a'.repeat(32);

  startStandalone(script, {
    hostname: 'test.example',
    gpc: true,
    dnt: false,
    framed: false,
  });

  expect((window as Window & { lvbt?: unknown }).lvbt).toBeUndefined();
  expect(document.querySelector('[data-lvbt-analytics]')).toBeNull();
});
