import { expect, test } from '@playwright/test';
import { captureBeacon, captureEvents } from '../../src/playwright.js';

test('enables analytics on the configured production host without browser storage', async ({
  context,
  page,
}) => {
  const beacons = await captureBeacon(page);
  const events = await captureEvents(page);

  await page.goto('/');
  await expect.poll(() => beacons.length).toBe(1);
  await page.getByRole('button', { name: 'Join' }).click();
  await expect.poll(() => events.length).toBe(1);

  expect(JSON.parse(events[0]?.body ?? '{}')).toEqual({
    name: 'join_click',
    props: { placement: 'inline' },
    site: 'analytics.test',
  });
  expect(await context.cookies()).toEqual([]);
  expect(
    await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length })),
  ).toEqual({ local: 0, session: 0 });
});

test('sends nothing from localhost', async ({ page }) => {
  const beacons = await captureBeacon(page);
  const events = await captureEvents(page);

  await page.goto('http://127.0.0.1:4174/');
  await page.getByRole('button', { name: 'Join' }).click();

  expect(beacons).toEqual([]);
  expect(events).toEqual([]);
});

test('sends nothing when Global Privacy Control is enabled', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'globalPrivacyControl', { value: true });
  });
  const beacons = await captureBeacon(page);
  const events = await captureEvents(page);

  await page.goto('/');
  await page.getByRole('button', { name: 'Join' }).click();

  expect(beacons).toEqual([]);
  expect(events).toEqual([]);
});
