import { init, type AnalyticsHandle, type InitOptions } from './init.js';

export function initFromScript(
  script: HTMLScriptElement | null = document.currentScript as HTMLScriptElement | null,
  overrides: Partial<InitOptions> = {},
): AnalyticsHandle {
  const site = script?.dataset.lvbtSite?.trim();
  if (!script || !site) throw new Error('The analytics script requires data-lvbt-site.');
  const { lvbtClicks, lvbtCollector, lvbtSpa, lvbtToken } = script.dataset;
  return init({
    site,
    ...(lvbtToken ? { token: lvbtToken } : {}),
    ...(lvbtCollector ? { collector: lvbtCollector } : {}),
    spa: lvbtSpa !== 'false',
    clicks: lvbtClicks !== 'false',
    ...overrides,
  });
}
