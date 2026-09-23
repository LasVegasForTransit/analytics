// lvwwd.org, the Week Without Driving Las Vegas campaign site, counts its
// campaign steps with these values. Each is a day of the week, a running
// count, or a fixed label; none says who a person is or what they wrote.
const campaignDays = ['1', '2', '3', '4', '5', '6', '7', '8'] as const;
// prettier-ignore
const markedSquares = [
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12',
  '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24',
] as const;
const completedLines = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'] as const;

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
  campaign_signup: { source: 'client', sites: ['lvwwd.org'], props: {} },
  week_link_requested: {
    source: 'client',
    sites: ['lvwwd.org'],
    props: { method: ['link_form', 'signup_form'] },
  },
  trip_entry_submitted: {
    source: 'client',
    sites: ['lvwwd.org'],
    props: { day: campaignDays, method: ['link', 'screenshot', 'link_and_screenshot'] },
  },
  trip_picture_shared: {
    source: 'client',
    sites: ['lvwwd.org'],
    props: { method: ['share_sheet', 'download'] },
  },
  bingo_square_marked: { source: 'client', sites: ['lvwwd.org'], props: { marked: markedSquares } },
  bingo_completed: { source: 'client', sites: ['lvwwd.org'], props: { lines: completedLines } },
  bus_finder_used: {
    source: 'client',
    sites: ['lvwwd.org'],
    props: { method: ['my_location', 'place'] },
  },
  app_installed: {
    source: 'client',
    sites: ['lvwwd.org'],
    props: { method: ['browser', 'home_screen'] },
  },
  material_printed: {
    source: 'client',
    sites: ['lvwwd.org'],
    props: { item: ['partner_flyer', 'bingo_card'] },
  },
  mail_in_viewed: { source: 'client', sites: ['lvwwd.org'], props: {} },
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
