# Add analytics to an LVBT site

This tutorial connects a new Astro or Vite application to the shared production property and
collector. The repository needs the standard LVBT build commands and a Cloudflare production
hostname.

## Install and identify the site

Install the package at the organization-approved version:

```bash
pnpm add @lasvegasfortransit/analytics
```

Use the production hostname as `site`. Do not invent a product ID or include `https://`.

## Get a Cloudflare Web Analytics token

Check first: a `lasvegasfortransit.org` subdomain (the root domain, `labs.`, `fund.`, or `map.`)
shares the organization's existing Web Analytics property and its token, the GitHub organization
variable `PUBLIC_LVBT_CWA_TOKEN`. Confirm it already exists —
`gh variable list --org LasVegasForTransit` — and skip to
[Configure production](#configure-production). Never create a second Web Analytics property for a
`lasvegasfortransit.org` subdomain; one property already covers the whole domain.

A site on any other domain (for example `lvwwd.org`) needs its own property and its own token,
because a Cloudflare Web Analytics token is scoped to one hostname family:

1. Open the account's Web Analytics page (<https://dash.cloudflare.com/?to=/:account/web-analytics>
   with the LVBT account) and click "Add a site". If the hostname is already listed, open it instead
   and skip to step 3.
2. Choose the new site's hostname and click "Done". Cloudflare defaults every new site to automatic
   setup, which injects the beacon itself; open "Manage site" and change it to "Enable with JS
   Snippet installation" instead, because this repository's own client loads the beacon — automatic
   injection would load it twice. If the hostname is not proxied through Cloudflare (not
   orange-clouded), Cloudflare only offers the JS snippet option, so there is nothing to change.
3. On "Manage site", copy only the token inside `data-cf-beacon='{"token": "..."}'` in the shown
   snippet (32 lowercase letters and digits). It is public by design, so it is a GitHub environment
   variable, not a secret: in the consuming repository, Settings → Environments → `production` →
   Environment variables → "Add environment variable", name `PUBLIC_LVBT_CWA_TOKEN`, value the token
   you copied.

For Astro, add the integration to `astro.config.ts`:

```ts
import lvbtAnalytics from '@lasvegasfortransit/analytics/astro';

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
import { init } from '@lasvegasfortransit/analytics';

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
