# Verify a deployment

Verification checks the page, bundled client, Cloudflare Web Analytics request, configured site,
security policy, collector, privacy gate, and one real event. A successful page response alone does
not prove analytics works.

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

## Collector staging and promotion

The collector's saved-release configuration is in `.lvbt/tooling.json`. It packages the actual
compiled Worker modules, preserves the dataset, limiter and secret binding declarations, and adds
the `/lvbt-release.json` identity endpoint. Its API smoke requires `/health` to return status 200
and exactly `ok`, together with the selected commit and release ID. The analytics package's browser
and privacy acceptance remains part of `pnpm check`.

The reviewed `workersDevSubdomain` is `las-vegas-for-better-transit`; saved candidate checks reject
matching Worker names under any other account before sending Access credentials. This is a public
account identifier observed through the read-only account Workers subdomain API.

The staging and promotion callers require the reviewed shared tooling release. Update their
immutable workflow references with the canonical tooling upgrade before enabling the new route.
**Promote collector release** is the only collector production workflow. Recovery selects an
explicit successful staging `run_id` and publishes its retained bytes through the same shared
verification and promotion path, using the existing `production` environment and credentials.
Missing or expired staging artifacts stop recovery; no workflow rebuilds and deploys production
directly.

For first adoption, a maintainer inspects the current production Worker version and supplies its
UUID as `expected_version`, or uses `pnpm promote --run-id <run> --expected-version <UUID>`. The
shared path checks that version before production upload, migration and activation. A legacy or
missing public marker is recorded as provider-version evidence with no invented release ID. If the
version changed, stop and inspect the deployment before requesting promotion again. These
read-before-write checks do not replace coordination with other production writers.

`apps/collector/platform.json` declares production bindings, GitHub environment credentials and
preview variables for shared read-only readiness checks. Set `CLOUDFLARE_ACCOUNT_ID` and
`CLOUDFLARE_ZONE_ID` to the reviewed account and zone selectors before running production preflight.
The manifest verifies configured and deployed binding declarations; runtime event delivery still
requires separate acceptance. Missing or unknown provider observations cannot pass.

A maintainer must choose an isolated Analytics Engine dataset name and a distinct unused rate-limit
namespace.
[Analytics Engine creates the dataset on its first write](https://developers.cloudflare.com/analytics/analytics-engine/get-started/);
verify that the selected preview dataset is distinct before sending an approved preview event.
Provision the preview Worker signing secret and configure Cloudflare Access to deny anonymous
requests on both its configured origin and version preview hostnames. Agent sessions must not set
secrets or modify provider resources.

Set the repository variable `LVBT_PREVIEW_URL` to the reviewed HTTPS preview origin. Set
`LVBT_PREVIEW_BINDINGS` to a public JSON descriptor containing exactly `EVENTS`, `EVENT_LIMITER`,
and `LVBT_EVENTS_SECRET`. Preserve the production descriptor's types and limiter settings; use the
separately selected preview dataset and namespace. The secret entry is only `{"type":"secret"}`.
Never include a credential value in this descriptor. Missing, unsupported, or shared production
bindings prevent artifact packaging.

Keep the existing `production` environment's `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`
secret names. The manifest declares separate `CLOUDFLARE_API_TOKEN` target groups for `production`
and `collector-preview`; setup requests independent values and never copies the production token
into preview. The separate preview environment also needs `CF_ACCESS_CLIENT_ID` and
`CF_ACCESS_CLIENT_SECRET`. Restrict both environments to the protected default branch; production
requires maintainer approval. The shared workflow accepts the account ID secret and forwards the
public preview descriptor.

After setup, run **Deploy collector staging**. It retains one immutable release, verifies the saved
identity and health behavior behind Access, and activates only that verified preview version. Review
the preview, then run `pnpm promote` or **Promote collector release** to promote the same artifact.
Retain the successful run and publication receipt. Staging adoption is not complete until these
provider and runtime checks succeed; never infer it from local tests.

## Unverified provider gates

The migration has not verified an isolated preview Worker, reviewed preview origin and binding
descriptor, preview limiter namespace usage, Worker signing secret, Access service-auth policy and
service credential, or protected environment configuration. It has not run protected saved staging,
sent an approved preview event and verified its dataset readback, or promoted that exact artifact.
These are maintainer and authenticated runtime gates. Until they pass, shared recovery and promotion
fail closed. Local validation does not authorize a production deployment.

The weekly report uses the approved contribution helper's recurring route. Its seven-day and
thirty-day reports remain product evidence; issue reconciliation uses the shared trusted workflow
and uploaded-action verification. The declared stable report stays pinned. A failed measurement
leaves that report open and records a scheduled maintenance alert; only a verified successful
measurement resolves the corresponding alert. Reviewed adoption preserves each unique existing
GitHub Actions bot issue's number and verifies its new visible ownership labels. Actual GitHub
reconciliation has not been performed during this migration.
