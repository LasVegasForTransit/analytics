export type GateReason =
  | 'no-token'
  | 'gpc'
  | 'dnt'
  | 'framed'
  | 'excluded-path'
  | 'localhost'
  | 'preview-host'
  | 'hostname-mismatch';

export interface GateInput {
  site: string;
  token?: string;
  hostname?: string;
  pathname?: string;
  gpc?: boolean;
  dnt?: boolean;
  framed?: boolean;
  exclude?: RegExp[];
}

export type GateResult = { enabled: true } | { enabled: false; reason: GateReason };

function browserFramed() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function browserGpc() {
  return (
    (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true
  );
}

function browserDnt() {
  return navigator.doNotTrack === '1';
}

// eslint-disable-next-line complexity -- Explicit checks preserve gate priority and browser size.
export function shouldEnable(input: GateInput): GateResult {
  const hostname = input.hostname ?? location.hostname;
  const pathname = input.pathname ?? location.pathname;
  let reason: GateReason | undefined;
  if (!input.token?.trim()) reason = 'no-token';
  else if (input.gpc ?? browserGpc()) reason = 'gpc';
  else if (input.dnt ?? browserDnt()) reason = 'dnt';
  else if (input.framed ?? browserFramed()) reason = 'framed';
  else if (input.exclude?.some((pattern) => matches(pattern, pathname))) reason = 'excluded-path';
  else if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1')
    reason = 'localhost';
  else if (hostname.endsWith('.pages.dev') || hostname.endsWith('.workers.dev'))
    reason = 'preview-host';
  else if (hostname !== input.site && hostname !== `www.${input.site}`)
    reason = 'hostname-mismatch';
  if (reason) return { enabled: false, reason };
  return { enabled: true };
}
import { matches } from './pattern.js';
