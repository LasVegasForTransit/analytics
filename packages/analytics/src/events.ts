export const EVENTS = {
  newsletter_signup: {
    source: 'server',
    sites: ['lasvegasfortransit.org'],
    props: { method: ['site_form', 'membership_form'] },
  },
  membership_intake: { source: 'server', sites: ['lasvegasfortransit.org'], props: {} },
  join_click: {
    source: 'client',
    sites: [
      'lasvegasfortransit.org',
      'labs.lasvegasfortransit.org',
      'fund.lasvegasfortransit.org',
      'map.lasvegasfortransit.org',
    ],
    props: { placement: ['header', 'footer', 'hero', 'inline', 'dialog'] },
  },
  donate_click: {
    source: 'client',
    sites: [
      'lasvegasfortransit.org',
      'labs.lasvegasfortransit.org',
      'fund.lasvegasfortransit.org',
      'map.lasvegasfortransit.org',
    ],
    props: { placement: ['header', 'footer', 'hero', 'inline', 'dialog'] },
  },
  tool_feature_used: {
    source: 'client',
    sites: [
      'labs.lasvegasfortransit.org',
      'fund.lasvegasfortransit.org',
      'map.lasvegasfortransit.org',
    ],
    props: {
      feature: [
        'share_created',
        'share_opened',
        'export_png',
        'export_svg',
        'export_json',
        'gtfs_import',
        'sim_started',
        'fuel_lever_moved',
        'scenario_changed',
      ],
    },
  },
} as const;

export type EventName = keyof typeof EVENTS;
type Values<T> = T[keyof T];
type EventProps<N extends EventName> = (typeof EVENTS)[N]['props'];
export type PropsFor<N extends EventName> = {
  [K in keyof EventProps<N>]: EventProps<N>[K] extends readonly string[]
    ? EventProps<N>[K][number]
    : never;
};
export type AnalyticsEvent = Values<{
  [N in EventName]: { site: string; name: N; props: PropsFor<N> };
}>;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function eventPayload(value: unknown): AnalyticsEvent {
  if (!record(value) || typeof value.site !== 'string' || typeof value.name !== 'string')
    throw new Error('Analytics event must include a site and declared event name.');
  if (!Object.prototype.hasOwnProperty.call(EVENTS, value.name))
    throw new Error('Analytics event is not declared.');
  const name = value.name as EventName;
  const declaration = EVENTS[name];
  if (!record(value.props)) throw new Error('Analytics event is not declared.');
  const expected = Object.entries(declaration.props) as Array<[string, readonly string[]]>;
  if (Object.keys(value.props).length !== expected.length)
    throw new Error('Analytics event properties do not match the allowlist.');
  for (const [key, allowed] of expected) {
    if (typeof value.props[key] !== 'string' || !allowed.includes(value.props[key]))
      throw new Error(`Analytics event property ${key} is not allowed.`);
  }
  return value as AnalyticsEvent;
}
