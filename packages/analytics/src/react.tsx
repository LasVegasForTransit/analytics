import {
  createContext,
  createElement,
  type PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from 'react';
import { init, type AnalyticsHandle, type InitOptions } from './init.js';

const disabled: AnalyticsHandle = { enabled: false, reason: 'no-token', track() {} };
const AnalyticsContext = createContext<AnalyticsHandle>(disabled);

export function Analytics({ children, ...options }: PropsWithChildren<InitOptions>) {
  const [handle, setHandle] = useState<AnalyticsHandle>(disabled);
  useEffect(() => setHandle(init(options)), [options]);
  return createElement(AnalyticsContext.Provider, { value: handle }, children);
}

export function useAnalytics() {
  return useContext(AnalyticsContext);
}

export function useTrack() {
  return useAnalytics().track;
}
