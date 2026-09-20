import type { AstroIntegration } from 'astro';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

export interface LvbtAnalyticsOptions {
  site: string;
  collector?: string;
  spa?: boolean;
  clicks?: boolean;
  exclude?: string[];
  noPageviews?: string[];
}

export function lvbtAnalytics(options: LvbtAnalyticsOptions): AstroIntegration {
  return {
    name: '@lasvegasfortransit/analytics',
    hooks: {
      'astro:config:setup': ({ command, config, injectScript, updateConfig }) => {
        const env = { ...loadEnv(command, fileURLToPath(config.root), ''), ...process.env };
        const token = env.PUBLIC_LVBT_CWA_TOKEN?.trim();
        if (!token) {
          if (command === 'build' && env.LVBT_REQUIRE_ANALYTICS === '1')
            throw new Error('PUBLIC_LVBT_CWA_TOKEN is required when LVBT_REQUIRE_ANALYTICS=1.');
          return;
        }
        const { exclude, noPageviews, ...serializable } = options;
        const collector =
          serializable.collector ?? env.PUBLIC_LVBT_ANALYTICS_COLLECTOR?.trim() ?? undefined;
        const patternAssignments = [
          exclude
            ? `options.exclude = [${exclude.map((pattern) => `new RegExp(${JSON.stringify(pattern)})`).join(',')}];`
            : '',
          noPageviews
            ? `options.noPageviews = [${noPageviews.map((pattern) => `new RegExp(${JSON.stringify(pattern)})`).join(',')}];`
            : '',
        ].join('');
        injectScript(
          'page',
          `import { init } from '@lasvegasfortransit/analytics'; const options = ${JSON.stringify({ ...serializable, collector, token })}; ${patternAssignments} init(options);`,
        );
        updateConfig({ vite: { build: { assetsInlineLimit: 0 } } });
      },
    },
  };
}

export default lvbtAnalytics;
