# LVBT Analytics

LVBT Analytics gives Las Vegas for Better Transit one privacy-preserving measurement standard across
its public websites and tools. Cloudflare Web Analytics records page use and performance; the
first-party collector records a small, typed set of conversion events.

The system does not set cookies, create visitor identifiers, fingerprint browsers, or retain IP
addresses and user agents. Global Privacy Control and Do Not Track disable both measurement paths.
Analytics stays off on localhost, preview deployments, retired archives, and framed embeds.

## Choose an integration

| Project              | Entry point             | Setup                                                      |
| -------------------- | ----------------------- | ---------------------------------------------------------- |
| Astro                | `@lvbt/analytics/astro` | Add `lvbtAnalytics({ site })` to `astro.config.ts`         |
| Vite or React        | `@lvbt/analytics`       | Call `init({ site, token })` before rendering              |
| React component tree | `@lvbt/analytics/react` | Render `<Analytics>` and call `useTrack()`                 |
| Plain HTML           | generated client        | Run `lvbt-analytics client --out public/lvbt-analytics.js` |

Production builds receive `PUBLIC_LVBT_CWA_TOKEN` and set `LVBT_REQUIRE_ANALYTICS=1`. Preview and
local builds receive neither value, so the client is absent rather than merely pointed at a test
property.

```ts
import lvbtAnalytics from '@lvbt/analytics/astro';

export default defineConfig({
  integrations: [lvbtAnalytics({ site: 'labs.lasvegasfortransit.org' })],
});
```

```ts
import { init } from '@lvbt/analytics';

init({
  site: 'map.lasvegasfortransit.org',
  token: import.meta.env.PUBLIC_LVBT_CWA_TOKEN,
  noPageviews: [/^\/s\//],
});
```

Start with the [integration tutorial](docs/development/tutorials/add-analytics-to-a-new-site.md).
The [privacy contract](docs/security/reference/privacy-contract.md) defines the non-negotiable data
boundary, and the [operations runbook](docs/operations/runbooks/dashboard-shows-zero.md) covers a
quiet dashboard or failed collector.

## Work in this repository

```bash
pnpm bootstrap
pnpm check
```

The workspace contains the published client in `packages/analytics`, the collector Worker in
`apps/collector`, and the fixed-query report command in `tools/report`. The
[documentation index](docs/README.md) groups contributor material by task.
