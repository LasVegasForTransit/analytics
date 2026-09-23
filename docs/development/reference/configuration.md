# Configuration

Every LVBT web property uses the same variable names and production gate. The Web Analytics token is
public by design because it appears in browser markup. Collector and reporting credentials stay
secret.

## Build variables

| Name                              | Location                     | Purpose                                                     |
| --------------------------------- | ---------------------------- | ----------------------------------------------------------- |
| `PUBLIC_LVBT_CWA_TOKEN`           | GitHub organization variable | Cloudflare Web Analytics site token                         |
| `PUBLIC_LVBT_ANALYTICS_COLLECTOR` | optional build variable      | Overrides `https://events.lasvegasfortransit.org`           |
| `LVBT_REQUIRE_ANALYTICS`          | production build environment | Fails an Astro production build when the CWA token is empty |

Production deploy jobs export the token and set `LVBT_REQUIRE_ANALYTICS=1`. Pull-request builds,
preview Workers, local development, and archive builds omit both. This separation keeps preview
traffic out of the production property.

Vite applications include `PUBLIC_` in `envPrefix`:

```ts
export default defineConfig({
  envPrefix: ['VITE_', 'PUBLIC_'],
});
```

## Secrets

| Name                              | Scope                               | Purpose                                           |
| --------------------------------- | ----------------------------------- | ------------------------------------------------- |
| `LVBT_EVENTS_SECRET`              | collector Worker and website Worker | Authenticates server-originated conversion events |
| `CLOUDFLARE_ANALYTICS_READ_TOKEN` | analytics repository                | Reads Analytics Engine through the SQL API        |
| `CLOUDFLARE_ACCOUNT_ID`           | analytics repository                | Selects the LVBT Cloudflare account for reports   |

`LVBT_EVENTS_SECRET` contains 32 random bytes encoded as hexadecimal. Cloudflare stores the same
value as an encrypted secret on each server that sends an event. Browser code never receives it.

The reporting token carries only **Account Analytics: Read** for the LVBT account. It has no Worker,
DNS, or account-management permission.

## Site identifiers

Site identifiers are production hostnames without a scheme or path:

- `lasvegasfortransit.org`
- `labs.lasvegasfortransit.org`
- `fund.lasvegasfortransit.org`
- `map.lasvegasfortransit.org`
- `lvwwd.org`, the Week Without Driving Las Vegas campaign site

The client accepts the exact hostname and its `www.` form. Other hostnames fail the production gate.

`lvwwd.org` is not a `lasvegasfortransit.org` subdomain, so the organization's Web Analytics site
does not cover it. It has its own Web Analytics site, and its token lives in the
week-without-driving repository's `production` environment rather than in the organization variable.
