import { beforeEach, expect, test, vi } from 'vitest';
import { initFromScript } from '../src/client.js';
import { resetForTesting } from '../src/init.js';
import { serveAsProduction } from '../src/playwright.js';

beforeEach(() => {
  Object.defineProperty(navigator, 'globalPrivacyControl', { configurable: true, value: false });
  Object.defineProperty(navigator, 'doNotTrack', { configurable: true, value: '0' });
  document.head.replaceChildren();
  resetForTesting();
});

test('initializes from explicit script data attributes', () => {
  const append = vi.spyOn(document.head, 'append').mockImplementation(() => undefined);
  const script = document.createElement('script');
  script.dataset.lvbtSite = 'test.example';
  script.dataset.lvbtToken = 'a'.repeat(32);
  script.dataset.lvbtCollector = 'https://events.example.test';

  const handle = initFromScript(script);

  expect(handle).toMatchObject({ enabled: true });
  expect(append).toHaveBeenCalledOnce();
});

test('fails closed when the script does not declare a site', () => {
  expect(() => initFromScript(document.createElement('script'))).toThrow('data-lvbt-site');
});

test('maps a local browser server onto the production hostname', () => {
  expect(serveAsProduction('http://127.0.0.1:4174', 'labs.lasvegasfortransit.org')).toEqual({
    chromiumArgs: ['--host-resolver-rules=MAP labs.lasvegasfortransit.org 127.0.0.1'],
    url: 'http://labs.lasvegasfortransit.org:4174/',
  });
});
