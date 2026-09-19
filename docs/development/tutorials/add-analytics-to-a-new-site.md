# Add analytics to an LVBT site

This tutorial connects a new Astro or Vite application to the shared production property and
collector. The repository needs the standard LVBT build commands and a Cloudflare production
hostname.

## Install and identify the site

Install the package at the organization-approved version:

```bash
pnpm add @lvbt/analytics
```

Use the production hostname as `site`. Do not invent a product ID or include `https://`.

For Astro, add the integration to `astro.config.ts`:

```ts
import lvbtAnalytics from '@lvbt/analytics/astro';

export default defineConfig({
  integrations: [lvbtAnalytics({ site: 'example.lasvegasfortransit.org' })],
});
```

For Vite, allow the shared public prefix and initialize before application rendering:

```ts
// vite.config.ts
export default defineConfig({ envPrefix: ['VITE_', 'PUBLIC_'] });
```

```ts
// src/main.tsx
import { init } from '@lvbt/analytics';

init({
  site: 'example.lasvegasfortransit.org',
  token: import.meta.env.PUBLIC_LVBT_CWA_TOKEN,
});
```

## Apply the security policy

Merge the required origins into the application's Cloudflare `_headers` file:

```bash
pnpm exec lvbt-analytics csp --write public/_headers
pnpm exec lvbt-analytics csp --check public/_headers
```

Inspect the diff. The command preserves existing directives and fails when the file has no CSP to
extend.

## Configure production

The production build job exports the organization variable and enables the guard:

```yaml
env:
  PUBLIC_LVBT_CWA_TOKEN: ${{ vars.PUBLIC_LVBT_CWA_TOKEN }}
  LVBT_REQUIRE_ANALYTICS: '1'
```

Preview and validation jobs do not export either value. No repository-local copy of the public token
is required.

## Prove both paths

Build a pull-request preview, then verify that analytics is absent:

```bash
pnpm exec lvbt-analytics verify "$PREVIEW_URL" --expect absent
```

After production deployment, verify that the beacon exists:

```bash
pnpm exec lvbt-analytics verify https://example.lasvegasfortransit.org --expect present
curl --fail https://events.lasvegasfortransit.org/health
```

Open the site with Global Privacy Control enabled and confirm that the browser sends neither a
Cloudflare beacon request nor an event request. Repeat with a normal browser profile and one
allowlisted test interaction.

## Record the integration

Add one site-specific analytics reference page beside the application's other operational docs.
Record the hostname, integration file, excluded paths, emitted events, workflow variables, and
verification command. Link to the central privacy contract rather than copying it.
