import { clientEvent, delegatedEvent } from './client-events.js';
import type { EventName, PropsFor } from './events.js';
import { shouldEnable, type GateInput, type GateReason } from './gate.js';
import { matches } from './pattern.js';

export const DEFAULT_COLLECTOR = 'https://events.lasvegasfortransit.org';

export interface InitOptions extends Pick<GateInput, 'site' | 'token' | 'exclude'> {
  collector?: string;
  noPageviews?: RegExp[];
  spa?: boolean;
  clicks?: boolean;
}

export interface AnalyticsHandle {
  enabled: boolean;
  reason?: GateReason;
  track: <N extends EventName>(name: N, props: PropsFor<N>) => void;
}

interface AnalyticsWindow extends Window {
  lvbt?: Pick<AnalyticsHandle, 'track'>;
}

let current: AnalyticsHandle | undefined;
let removeClickListener: (() => void) | undefined;

function installBeacon(token: string, spa: boolean) {
  if (document.querySelector('[data-lvbt-analytics]')) return;
  const script = document.createElement('script');
  script.type = 'module';
  script.defer = true;
  script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  script.dataset.cfBeacon = JSON.stringify({ token, spa });
  script.dataset.lvbtAnalytics = '';
  document.head.append(script);
}

function eventSender(site: string, collector: string, exclude: RegExp[] = []) {
  const sent = new Set<string>();
  return <N extends EventName>(name: N, props: PropsFor<N>) => {
    if (exclude.some((pattern) => matches(pattern, location.pathname))) return;
    const payload = clientEvent(site, name, props);
    const body = JSON.stringify(payload);
    if (sent.has(body)) return;
    sent.add(body);
    const blob = new Blob([body], { type: 'text/plain' });
    if (typeof navigator.sendBeacon === 'function' && navigator.sendBeacon(`${collector}/e`, blob))
      return;
    void fetch(`${collector}/e`, { method: 'POST', body, keepalive: true });
  };
}

function installClickTracking(track: AnalyticsHandle['track']) {
  const listener = (event: Event) => {
    const target =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>('[data-lvbt-event]')
        : null;
    if (!target) return;
    const payload = delegatedEvent(target);
    if (payload) track(payload.name, payload.props);
  };
  document.addEventListener('click', listener);
  return () => document.removeEventListener('click', listener);
}

export function init(options: InitOptions): AnalyticsHandle {
  if (current) return current;
  const gate = shouldEnable(options);
  if (!gate.enabled) {
    current = { ...gate, track() {} };
    return current;
  }
  const track = eventSender(options.site, options.collector ?? DEFAULT_COLLECTOR, options.exclude);
  current = { enabled: true, track };
  if (!options.noPageviews?.some((pattern) => matches(pattern, location.pathname)))
    installBeacon(
      options.token?.trim() ?? '',
      options.spa === false || options.exclude?.length || options.noPageviews?.length
        ? false
        : true,
    );
  if (options.clicks !== false) removeClickListener = installClickTracking(track);
  (window as AnalyticsWindow).lvbt = { track };
  return current;
}

export function resetForTesting() {
  removeClickListener?.();
  removeClickListener = undefined;
  current = undefined;
  delete (window as AnalyticsWindow).lvbt;
}
