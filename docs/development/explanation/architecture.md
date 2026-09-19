# Architecture

LVBT Analytics separates general site use from explicit product actions. That division keeps the
browser client small, uses Cloudflare's established performance measurement, and preserves a strict
event schema under LVBT control.

## Data paths

Every production site initializes `@lvbt/analytics` with its hostname and the shared Web Analytics
token. The client checks privacy signals, environment, path exclusions, and framing before it does
anything. An enabled client loads Cloudflare's beacon and exposes one typed `track` function.

Pageviews, referrers, UTM attribution, and Core Web Vitals go directly to Cloudflare Web Analytics.
Allowlisted conversion events go to `events.lasvegasfortransit.org/e` as small `text/plain` JSON
bodies. The collector validates origin, source, site, event name, property keys, and enum values
before writing one Analytics Engine data point.

Server events use the same collector with a bearer secret. The website sends them only after the
underlying newsletter or membership operation succeeds.

## Repository boundaries

`packages/analytics` contains the zero-runtime-dependency client and adapters. `apps/collector`
contains the independently deployed Worker. `tools/report` contains fixed read-only queries and
Markdown rendering.

Consumer repositories own where events are attached to product interactions. They import no
collector implementation and do not define local copies of the allowlist.

## Failure behavior

Missing public configuration disables the client outside guarded production builds. A guarded
production build fails before deployment. Collector validation failures return a bounded 4xx
response without a data point. Client event delivery never blocks navigation or a product action.
