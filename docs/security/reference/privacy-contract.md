# Privacy contract

LVBT measures whether its public information and tools are useful without building profiles of the
people who use them. This contract applies to the client package, collector, reports, consumer
sites, tests, and operational changes.

## Collected data

Cloudflare Web Analytics records aggregate pageviews, referrers, UTM attribution, browser and
country summaries, Core Web Vitals, and related performance measurements under Cloudflare's
cookieless Web Analytics product.

The first-party collector records the production hostname, an allowlisted event name, allowlisted
enum properties, country from Cloudflare request metadata, a coarse `mobile`, `desktop`, `unknown`,
or `server` device class, the event source, and schema version. Analytics Engine retains this data
for three months, Cloudflare's retention period for Workers Analytics Engine.

## Never collected

- Cookies, persistent identifiers, or session identifiers
- Browser fingerprints
- IP addresses or user-agent strings in event rows
- Names, email addresses, form contents, search terms, or free text
- Full URLs, coordinates, map share identifiers, or uploaded data
- Analytics from localhost, previews, retired archives, or framed embeds

The rate limiter hashes the connecting IP with the current UTC date and site. The hash exists only
as a rate-limit key and is not written to Analytics Engine, logs, or reports.

## Privacy signals

`Sec-GPC: 1` and `DNT: 1` disable Web Analytics and custom events. The browser gate checks the
corresponding browser signals before loading either path. The collector repeats the check before
authentication, parsing, rate limiting, or storage.

No consent banner appears because the system uses no cookies or cross-site tracking. A future change
that adds identifiers, free-form data, a new processor, or a new tracker requires a public privacy
review before implementation.

## Access

Cloudflare account access follows LVBT maintainer roles. The reporting token has read-only Account
Analytics permission and stays restricted to this repository. Public applications never receive the
collector server secret or the reporting token.
