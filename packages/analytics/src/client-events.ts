import { eventPayload, EVENTS, type EventName, type PropsFor } from './events.js';

export function clientEvent<N extends EventName>(site: string, name: N, props: PropsFor<N>) {
  const event = eventPayload({ site, name, props });
  if (EVENTS[event.name].source !== 'client') throw new Error('Analytics event is not declared.');
  return event;
}

// data-lvbt-event names the event; data-lvbt-<property> carries each declared property.
export function delegatedEvent(target: HTMLElement) {
  const name = target.dataset.lvbtEvent ?? '';
  if (!Object.prototype.hasOwnProperty.call(EVENTS, name)) return undefined;
  const props = Object.fromEntries(
    Object.keys(EVENTS[name as EventName].props).map((key) => [
      key,
      target.dataset[`lvbt${key.charAt(0).toUpperCase()}${key.slice(1)}`],
    ]),
  );
  try {
    return clientEvent(target.dataset.lvbtSite ?? '', name as EventName, props as never);
  } catch {
    return undefined;
  }
}
