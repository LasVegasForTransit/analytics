export { csp } from './csp.js';
export {
  eventPayload,
  EVENTS,
  type AnalyticsEvent,
  type EventName,
  type PropsFor,
} from './events.js';
export { shouldEnable, type GateInput, type GateReason, type GateResult } from './gate.js';
export { DEFAULT_COLLECTOR, init, type AnalyticsHandle, type InitOptions } from './init.js';

export const VERSION = '0.2.0';
