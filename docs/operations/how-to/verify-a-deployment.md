# Verify a deployment

Verification checks the page, bundled client, security policy, collector, privacy gate, and one real
event. A successful page response alone does not prove analytics works.

For production:

```bash
pnpm exec lvbt-analytics verify https://labs.lasvegasfortransit.org \
  --site labs.lasvegasfortransit.org \
  --expect present
curl --fail --silent https://events.lasvegasfortransit.org/health
```

Inspect the production response headers and confirm the required CSP origins. Open the page at
desktop and mobile widths, trigger one declared interaction, and verify that the request body
contains only the site, event name, and enum properties.

Repeat with Global Privacy Control enabled. No request reaches either analytics endpoint.

For a preview or retired archive:

```bash
pnpm exec lvbt-analytics verify "$URL" \
  --site labs.lasvegasfortransit.org \
  --expect absent
```

Use browser network inspection to confirm the absence of both
`static.cloudflareinsights.com/beacon.min.js` and `events.lasvegasfortransit.org/e`.
