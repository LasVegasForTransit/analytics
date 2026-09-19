const placements = ['header', 'footer', 'hero', 'inline', 'dialog'];
const features = [
  'share_created',
  'share_opened',
  'export_png',
  'export_svg',
  'export_json',
  'gtfs_import',
  'sim_started',
  'fuel_lever_moved',
  'scenario_changed',
];

interface StandaloneEnvironment {
  hostname?: string;
  gpc?: boolean;
  dnt?: boolean;
  framed?: boolean;
}

interface StandaloneWindow extends Window {
  lvbt?: { track: (name: string, props: Record<string, string>) => void };
}

function framed() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function valid(name: string, props: Record<string, string>) {
  const key = name === 'tool_feature_used' ? 'feature' : 'placement';
  const values = key === 'feature' ? features : placements;
  return (
    (key === 'feature' || name === 'join_click' || name === 'donate_click') &&
    Object.keys(props).length === 1 &&
    values.includes(props[key] ?? '')
  );
}

// eslint-disable-next-line complexity -- Inline checks keep the standalone runtime under its budget.
export function startStandalone(
  script: HTMLScriptElement | null,
  environment: StandaloneEnvironment = {},
) {
  const site = script?.dataset.lvbtSite?.trim();
  const token = script?.dataset.lvbtToken?.trim();
  const hostname = environment.hostname ?? location.hostname;
  if (
    !script ||
    !site ||
    !token ||
    (environment.gpc ??
      (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl ===
        true) ||
    (environment.dnt ?? navigator.doNotTrack === '1') ||
    (environment.framed ?? framed()) ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.endsWith('.pages.dev') ||
    hostname.endsWith('.workers.dev') ||
    (hostname !== site && hostname !== `www.${site}`)
  )
    return;

  const collector = script.dataset.lvbtCollector ?? 'https://events.lasvegasfortransit.org';
  const sent = new Set<string>();
  const track = (name: string, props: Record<string, string>) => {
    if (!valid(name, props)) throw new Error('Analytics event is not declared.');
    const body = JSON.stringify({ site, name, props });
    if (sent.has(body)) return;
    sent.add(body);
    const blob = new Blob([body], { type: 'text/plain' });
    if (typeof navigator.sendBeacon === 'function' && navigator.sendBeacon(`${collector}/e`, blob))
      return;
    void fetch(`${collector}/e`, { method: 'POST', body, keepalive: true });
  };

  (window as StandaloneWindow).lvbt = { track };
  if (!document.querySelector('[data-lvbt-analytics]')) {
    const beacon = document.createElement('script');
    beacon.defer = true;
    beacon.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    beacon.dataset.cfBeacon = JSON.stringify({ token, spa: script.dataset.lvbtSpa !== 'false' });
    beacon.dataset.lvbtAnalytics = '';
    document.head.append(beacon);
  }
  if (script.dataset.lvbtClicks !== 'false')
    document.addEventListener('click', (event) => {
      const target =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>('[data-lvbt-event]')
          : null;
      if (!target) return;
      const name = target.dataset.lvbtEvent ?? '';
      const key = name === 'tool_feature_used' ? 'feature' : 'placement';
      const value = key === 'feature' ? target.dataset.lvbtFeature : target.dataset.lvbtPlacement;
      if (value && valid(name, { [key]: value })) track(name, { [key]: value });
    });
}
