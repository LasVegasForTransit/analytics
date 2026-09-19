# Dashboard shows zero

Start with the production page and move downstream. Avoid changing tokens or redeploying until the
failed boundary is known.

## Pageviews are missing

Run `lvbt-analytics verify <production-url> --expect present`. A failure usually means the
production build did not receive `PUBLIC_LVBT_CWA_TOKEN`, the Astro integration is absent, or the
Vite entry point did not call `init`.

Check the response CSP next. The browser console reports a blocked script when
`static.cloudflareinsights.com` is missing and a blocked measurement when `cloudflareinsights.com`
is missing.

Confirm that the URL is the exact production hostname. Preview domains, localhost, framed embeds,
and excluded paths stay off. Check the browser's own GPC and DNT settings before comparing against
another device. Cloudflare dashboard aggregation is not immediate, so use the network request as the
first proof.

## Conversion events are missing

```bash
curl --fail https://events.lasvegasfortransit.org/health
```

A failed health request points to Worker, route, DNS, or TLS configuration. A healthy collector with
a browser 400 response means the name, site, property key, or enum value differs from the allowlist.
A 403 means the request origin does not match the event site. A 429 means the client has crossed the
per-minute limit.

For server events, 401 means `LVBT_EVENTS_SECRET` differs between sender and collector. A successful
form action with no event also points to a missing sender secret because server instrumentation
stays silent when its secret is absent.

Run `pnpm report --days 7 --json` last. A SQL API error concerns the read token or account ID; an
empty valid response means no data reached Analytics Engine in that period.
