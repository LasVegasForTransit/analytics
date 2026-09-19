import { startStandalone } from './standalone-runtime.js';

startStandalone(document.currentScript as HTMLScriptElement | null);
