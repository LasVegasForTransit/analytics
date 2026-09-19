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
let removePageviewFilter: (() => void) | undefined;

function installBeacon(site: string, token: string, spa: boolean) {
  if (document.querySelector('[data-lvbt-analytics]')) return;
  const script = document.createElement('script');
  script.type = 'module';
  script.defer = true;
  script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  script.dataset.cfBeacon = JSON.stringify({ token, spa });
  script.dataset.lvbtAnalytics = '';
  script.dataset.lvbtSite = site;
  document.head.append(script);
}

function isCloudflareBeacon(url: string | URL) {
  const endpoint = new URL(String(url), location.href);
  return endpoint.hostname === 'cloudflareinsights.com' && endpoint.pathname === '/cdn-cgi/rum';
}

function payloadPath(body: Document | XMLHttpRequestBodyInit | null | undefined) {
  if (typeof body !== 'string') return location.pathname;
  try {
    const payload = JSON.parse(body) as { location?: unknown };
    return typeof payload.location === 'string'
      ? new URL(payload.location, location.href).pathname
      : location.pathname;
  } catch {
    return location.pathname;
  }
}

function installPageviewFilter(patterns: RegExp[]) {
  const blocks = (pathname: string) => patterns.some((pattern) => matches(pattern, pathname));
  const destinations = new WeakMap<XMLHttpRequest, string | URL>();
  const originalOpen = Reflect.get(XMLHttpRequest.prototype, 'open');
  const originalSend = Reflect.get(XMLHttpRequest.prototype, 'send');
  const sendBeaconDescriptor = Object.getOwnPropertyDescriptor(navigator, 'sendBeacon');
  const originalSendBeacon =
    typeof navigator.sendBeacon === 'function' ? navigator.sendBeacon.bind(navigator) : undefined;

  XMLHttpRequest.prototype.open = function (
    this: XMLHttpRequest,
    ...args: [
      method: string,
      url: string | URL,
      async?: boolean,
      username?: string | null,
      password?: string | null,
    ]
  ) {
    const url = args[1];
    destinations.set(this, url);
    Reflect.apply(originalOpen, this, args);
  };
  XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
    const destination = destinations.get(this);
    if (destination && isCloudflareBeacon(destination) && blocks(payloadPath(body))) return;
    originalSend.call(this, body);
  };
  if (typeof originalSendBeacon === 'function')
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      value(url: string | URL, data?: BodyInit | null) {
        if (isCloudflareBeacon(url) && blocks(location.pathname)) return true;
        return originalSendBeacon.call(navigator, url, data);
      },
    });

  return () => {
    XMLHttpRequest.prototype.open = originalOpen;
    XMLHttpRequest.prototype.send = originalSend;
    if (sendBeaconDescriptor) Object.defineProperty(navigator, 'sendBeacon', sendBeaconDescriptor);
    else Reflect.deleteProperty(navigator, 'sendBeacon');
  };
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
  const pageviewRules = [...(options.exclude ?? []), ...(options.noPageviews ?? [])];
  if (options.spa !== false && pageviewRules.length > 0)
    removePageviewFilter = installPageviewFilter(pageviewRules);
  const initialPageviewBlocked = pageviewRules.some((pattern) =>
    matches(pattern, location.pathname),
  );
  if (options.spa !== false || !initialPageviewBlocked)
    installBeacon(options.site, options.token?.trim() ?? '', options.spa !== false);
  if (options.clicks !== false) removeClickListener = installClickTracking(track);
  (window as AnalyticsWindow).lvbt = { track };
  return current;
}

export function resetForTesting() {
  removeClickListener?.();
  removePageviewFilter?.();
  removeClickListener = undefined;
  removePageviewFilter = undefined;
  current = undefined;
  delete (window as AnalyticsWindow).lvbt;
}
