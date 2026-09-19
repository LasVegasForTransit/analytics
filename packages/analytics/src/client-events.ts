import type { AnalyticsEvent, EventName, PropsFor } from './events.js';

const placements = ['header', 'footer', 'hero', 'inline', 'dialog'] as const;
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
] as const;

function declaration(name: EventName) {
  if (name === 'join_click' || name === 'donate_click') return ['placement', placements] as const;
  if (name === 'tool_feature_used') return ['feature', features] as const;
  return undefined;
}

export function clientEvent<N extends EventName>(site: string, name: N, props: PropsFor<N>) {
  const declared = declaration(name);
  if (
    !declared ||
    Object.keys(props).length !== 1 ||
    typeof props[declared[0] as keyof PropsFor<N>] !== 'string' ||
    !(declared[1] as readonly string[]).includes(props[declared[0] as keyof PropsFor<N>])
  )
    throw new Error('Analytics event is not declared.');
  return { site, name, props } as AnalyticsEvent;
}

export function delegatedEvent(target: HTMLElement) {
  const name = target.dataset.lvbtEvent as EventName;
  const key = name === 'tool_feature_used' ? 'feature' : 'placement';
  const value = key === 'feature' ? target.dataset.lvbtFeature : target.dataset.lvbtPlacement;
  try {
    return clientEvent(target.dataset.lvbtSite ?? '', name, {
      [key]: value,
    } as PropsFor<EventName>);
  } catch {
    return undefined;
  }
}
