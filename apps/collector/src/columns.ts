import { EVENTS, type AnalyticsEvent } from '@lasvegasfortransit/analytics';

export function dataPoint(
  event: AnalyticsEvent,
  context: { country: string; device: string; source: 'client' | 'server' },
): AnalyticsEngineDataPoint {
  const propertyNames = Object.keys(EVENTS[event.name].props);
  const propertyValues = propertyNames.map((name) => event.props[name as keyof typeof event.props]);
  return {
    indexes: [event.site],
    blobs: [
      event.site,
      event.name,
      context.country,
      context.device,
      context.source,
      '1',
      ...propertyValues,
    ],
    doubles: [1],
  };
}
