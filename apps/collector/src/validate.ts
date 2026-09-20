import { eventPayload, EVENTS, type AnalyticsEvent } from '@lasvegasfortransit/analytics';
import { z } from 'zod';

export type CollectedEvent = AnalyticsEvent & { country?: string };

const Envelope = z
  .object({
    site: z.string().min(1),
    name: z.string().min(1),
    props: z.record(z.string(), z.string()),
    country: z.union([z.string().regex(/^[A-Z]{2}$/), z.literal('T1')]).optional(),
  })
  .strict();

export function validateEvent(value: unknown, source: 'client' | 'server'): CollectedEvent {
  const envelope = Envelope.parse(value);
  if (source === 'client' && envelope.country) throw new Error('Client events cannot set country.');
  const payload = eventPayload(envelope);
  const declaration = EVENTS[payload.name];
  if (declaration.source !== source)
    throw new Error(`Event ${payload.name} is ${declaration.source}-only.`);
  if (!(declaration.sites as readonly string[]).includes(payload.site))
    throw new Error(`Event ${payload.name} is not permitted for ${payload.site}.`);
  return { ...payload, ...(envelope.country ? { country: envelope.country } : {}) };
}
