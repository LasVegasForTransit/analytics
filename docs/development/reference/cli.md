# Command line

The `lvbt-analytics` executable checks deployments, manages CSP entries, prints the event contract,
and creates the plain-HTML client.

## Deployment verification

```bash
pnpm exec lvbt-analytics verify https://labs.lasvegasfortransit.org \
  --site labs.lasvegasfortransit.org \
  --expect present
```

The verifier opens the page in Chromium and independently observes the Cloudflare script download,
an actual Cloudflare Web Analytics request, and any LVBT collector requests. It also verifies the
site declared by the deployed client and rejects collector requests attributed to another site. This
exercises the browser gate instead of looking for dormant strings in a bundle. `--expect absent`
proves a preview or archive sends none of those requests. A navigation failure or mismatched
expectation exits nonzero. The consuming repository supplies `@playwright/test` and its Chromium
browser.

## CSP checks

```bash
pnpm exec lvbt-analytics csp --check public/_headers
pnpm exec lvbt-analytics csp --write public/_headers
```

`--check` lists missing script and connection origins without changing the file. `--write` merges
the required origins into every existing CSP header and preserves unrelated directives. A file
without a CSP header fails rather than inventing a policy.

## Event reference

```bash
pnpm exec lvbt-analytics events --markdown
```

The table is generated from the same `EVENTS` object used by the client and collector.

## Plain HTML client

```bash
pnpm exec lvbt-analytics client --out public/lvbt-analytics.js
```

The command copies the bundled, dependency-free browser entry. Load it as a deferred classic script
and provide the site and token as data attributes:

```html
<script
  defer
  src="/lvbt-analytics.js"
  data-lvbt-site="example.lasvegasfortransit.org"
  data-lvbt-token="PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN"
></script>
```

The client starts when the script executes. Module scripts do not expose `document.currentScript`
and are not supported by this generated entry.
