# Standardized privacy-preserving analytics across LVBT web properties

## Context

Las Vegans for Better Transit (LVBT) runs four public web properties plus a docs-only research
workspace. Analytics today is inconsistent: the main website has a Cloudflare Web Analytics (CWA)
beacon wired in code but the deploy workflow never exports the token, so production ships no beacon;
Labs has analytics fully specified in docs but zero lines implemented; TransitFunding and
TransitMapper have nothing. No mechanism exists to share code between the repos.

| Property       | Directory          | Hostname                    | Stack                                     | Hosting                                   | Analytics today                                                                                                                                       |
| -------------- | ------------------ | --------------------------- | ----------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Website        | `website/`         | lasvegasfortransit.org      | Astro 6 static                            | Cloudflare Pages + Pages Functions        | CWA beacon in `src/layouts/BaseLayout.astro:183-194`, gated on `PUBLIC_CWA_TOKEN`; token missing from `.github/workflows/deploy-production.yml:24-30` |
| Labs           | `labs/`            | labs.lasvegasfortransit.org | Astro 6 home + Vite/React lab, pnpm+turbo | Workers Static Assets, one Worker per app | None. Docs specify CWA, prod-only, `@lvbt/brand` owns the "analytics hook"                                                                            |
| TransitFunding | `transit-funding/` | fund.lasvegasfortransit.org | Vite/React + Hono Worker                  | Workers                                   | None. CSP `script-src 'self'`, no `connect-src` (blocks everything)                                                                                   |
| TransitMapper  | `transit-mapper/`  | map.lasvegasfortransit.org  | Vite/React PWA + Hono Worker + D1         | Workers                                   | None. Embeds are a separate Vite entry (`embed.html`); share pages `/s/:id` reuse the SPA shell                                                       |
| gis            | `gis/`             | none                        | Markdown only                             | none                                      | Not a web property; out of scope                                                                                                                      |

Decisions the user made on 2026-09-01:

- Measure pageviews, referrers, UTM, Core Web Vitals, **plus** a small allowlisted set of conversion
  events (newsletter signup, join click, donate click, tool feature used).
- Cloudflare Web Analytics is the standard backend. CWA cannot record custom events, so events go to
  one tiny first-party Worker writing to Workers Analytics Engine. This is the only way to honor
  both choices; it adds one deployable, kept deliberately minimal.
- Distribute the shared client as a published public npm package `@lvbt/analytics` from a new repo
  `LasVegasForTransit/analytics`.
- Wire the standalone `transit-funding` repo now; the Labs copy is canonical going forward and
  inherits through the Labs shared hook.
- Heavy emphasis on developer ease of use, turnkey maintenance, and foolproof documentation for a
  new technical contributor (college students, first-time volunteers).

Privacy posture (fixed, documented as the org "privacy contract"): cookieless, no fingerprinting, no
persistent visitor or session IDs, no consent banner; Global Privacy Control (GPC) and Do Not Track
(DNT) disable everything, client and server side; production hostnames only (never localhost,
previews, `*.pages.dev`, `*.workers.dev`, archive builds, or framed embeds); event props are enums
only, never free text, URLs, coordinates, or share ids; no IP or user-agent retention.

## Architecture

```
                     ┌──────────────────────────────────────────────────┐
  four sites ──────► │ @lvbt/analytics  (npm, ~1 KB, zero runtime deps) │
  init({site,token}) │  gate → inject CWA beacon → track() → clicks     │
                     └───────┬──────────────────────────┬───────────────┘
                             │ pageviews, CWV, UTM      │ allowlisted events
                             ▼                          ▼
              Cloudflare Web Analytics        events.lasvegasfortransit.org
              (one site, one token,           Worker → Workers Analytics Engine
               postfix-matches subdomains)    (dataset lvbt_events, 3-month retention)
                                                        │
                                              pnpm report  +  weekly GitHub issue
```

Verified facts the design relies on (Cloudflare docs, 2026-09-01):

- One CWA token covers the apex hostname and every subdomain (postfix matching), and rejects
  `*.pages.dev` / `*.workers.dev`. So one token, one org-level GitHub variable, one dashboard with a
  Host breakdown.
- The CWA beacon auto-tracks SPA route changes (`"spa": true` default). No router integration
  needed.
- Astro 6 inlines processed `<script>` chunks under 4 KB, which the website CSP would block; the
  Astro integration must set `vite.build.assetsInlineLimit` to `false` for `.js`.
- Workers Analytics Engine: one index, up to 20 blobs, data kept 3 months, counts must use
  `SUM(_sample_interval)`, SQL API needs an "Account Analytics: Read" token.
- Workers Static Assets honor a `_headers` file for static responses (not Worker-generated ones).

## Repo `LasVegasForTransit/analytics` (new, MIT, pnpm workspace)

```
analytics/
├── packages/analytics/        # published as @lvbt/analytics
│   ├── src/index.ts           # init, track, shouldEnable, EVENTS, csp, VERSION, DEFAULT_COLLECTOR
│   ├── src/gate.ts            # pure shouldEnable()
│   ├── src/events.ts          # THE allowlist (shared with the collector via workspace import)
│   ├── src/csp.ts             # csp.directives / merge / check
│   ├── src/beacon.ts src/collector.ts src/init.ts
│   ├── src/client.ts          # drop-in for plain HTML: reads data-lvbt-* from its own <script>
│   ├── src/react.tsx          # <Analytics/> and useTrack()
│   ├── src/testing/index.ts   # Playwright helpers: serveAsProduction, captureBeacon, captureEvents
│   ├── src/node/index.ts      # checkHeadersFile() for _headers files
│   ├── src/cli/               # bin "lvbt-analytics": verify | csp | events | client
│   ├── astro/index.ts         # Astro integration lvbtAnalytics() (shipped as TS source)
│   ├── test/ (vitest + happy-dom, e2e/smoke.spec.ts on fixtures), size-budget.json, tsdown.config.ts
├── apps/collector/            # Worker lvbt-analytics-events (wrangler.jsonc, src/index.ts, validate.ts, columns.ts, cors.ts)
├── tools/report/              # pnpm report: fixed SQL → Markdown
├── docs/                      # Diátaxis, see Documentation plan
├── .github/workflows/         # ci.yml (Validate), release.yml (release-please + npm trusted publish),
│                              # deploy-collector.yml, weekly.yml (verify 4 hosts + report → pinned issue)
├── .lvbt/commit-scopes.txt    # client astro react cli collector report docs ci dx
└── .lvbt/repository-tooling.json, plugins/lvbt-contributions/ (vendored, like website)
```

Tooling: tsdown (ESM + `.d.ts` + publint), Vitest 4, Playwright 1.62, TypeScript 6.0.3 (match
consumers), release-please + `npm publish --provenance` via OIDC trusted publishing (conventional
commits are already the org grammar; no per-PR changeset files for volunteers to forget). Zero
runtime dependencies is enforced by a unit test. Size budget: `client.js` ≤ 1024 B gzip, `index.js`
≤ 1536 B gzip (website JS budget is 12 KB with ~10.9 KB used).

### Public API of `@lvbt/analytics`

```ts
// site is the production hostname. It is both the identifier and the gate rule.
init({ site: string; token?: string; collector?: string; exclude?: RegExp[]; noPageviews?: RegExp[]; spa?: boolean; clicks?: boolean }): { enabled: boolean; reason?: GateReason; track }
track<N extends EventName>(name: N, props: PropsFor<N>): void       // no-op until init enabled it; dedupes per page load
shouldEnable({ site, hostname, pathname?, token?, gpc?, dnt?, framed?, exclude? }): { enabled: true } | { enabled: false; reason }
// reasons, in order: no-token | gpc | dnt | framed | excluded-path | localhost | preview-host | hostname-mismatch
csp.directives(collector?) / csp.merge(header, collector?) / csp.check(header, collector?)
EVENTS, EventName, PropsFor<N>, DEFAULT_COLLECTOR = 'https://events.lasvegasfortransit.org', VERSION
```

Behavior of `init` when the gate passes: append
`<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":…,"spa":…}' data-lvbt-analytics>`
(skipped on `noPageviews` paths, which exist for id-bearing routes like TransitMapper `/s/:id`);
bind `track` to `navigator.sendBeacon(collector + '/e', Blob text/plain)` with `fetch keepalive`
fallback (`text/plain` avoids a CORS preflight); expose `window.lvbt = { track }` for classic
scripts; install one delegated click listener that reads `data-lvbt-event` and
`data-lvbt-placement|feature` so most conversions need no JavaScript. Nothing is stored in the
browser and nothing is read from the URL.

Framework entry points: Astro sites use the integration (`lvbtAnalytics({ site })` in
`astro.config`, which reads `PUBLIC_LVBT_CWA_TOKEN` via `loadEnv`, injects an external `_astro/*.js`
module via `injectScript('page', …)`, and throws a clear error when `LVBT_REQUIRE_ANALYTICS=1` and
the token is empty). Vite/React apps call `init()` as the first line of `main.tsx`. Plain HTML uses
`npx lvbt-analytics client --out public/lvbt-analytics.js`.

### Event allowlist (single source of truth, `packages/analytics/src/events.ts`)

Every prop is an enum. Adding an event is one entry here plus one doc row; the collector, the client
types, the `events` CLI table, and the report all derive from it.

| Event               | Source | Sites           | Props (enum)                                                                                                                                              |
| ------------------- | ------ | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `newsletter_signup` | server | website         | `method: site_form \| membership_form`                                                                                                                    |
| `membership_intake` | server | website         | none                                                                                                                                                      |
| `join_click`        | client | all             | `placement: header \| footer \| hero \| inline \| dialog`                                                                                                 |
| `donate_click`      | client | all             | same                                                                                                                                                      |
| `tool_feature_used` | client | fund, map, labs | `feature: share_created \| share_opened \| export_png \| export_svg \| export_json \| gtfs_import \| sim_started \| fuel_lever_moved \| scenario_changed` |

UTM attribution stays with CWA (it reads `utm_*` from the URL itself). Free-form campaign values
would violate the enum rule, so no first-party campaign event.

### Collector Worker `lvbt-analytics-events` (`apps/collector`)

- `wrangler.jsonc`: `routes: [{ pattern: 'events.lasvegasfortransit.org', custom_domain: true }]`,
  `workers_dev: false`,
  `analytics_engine_datasets: [{ binding: 'EVENTS', dataset: 'lvbt_events' }]`,
  `ratelimits: [{ name: 'EVENT_LIMITER', simple: { limit: 30, period: 60 } }]`, observability on. No
  KV, D1, DO, or cron. Secret: `LVBT_EVENTS_SECRET` (server events only).
- `POST /e` with JSON `{ site, name, props }`; `GET /health` → 200 (used by `verify`).
- Client requests: `Origin` must be `https://<site>` or `https://www.<site>` (403 otherwise); body ≤
  1024 B (413); `Sec-GPC: 1` or `DNT: 1` → 204 and nothing written; rate limit keyed on a
  daily-salted SHA-256 of the client IP that is never persisted (429). Server requests: bearer
  `LVBT_EVENTS_SECRET` (401), may carry `country`.
- Validation with zod derived from `EVENTS`: unknown event, unknown or missing prop, prop value
  outside the enum, site not permitted for the event, client sending a server-only event → 400.
- Only server-side derivations: `request.cf.country` and `Sec-CH-UA-Mobile` →
  `mobile|desktop|unknown|server`. User-Agent, IP, Referer, cookies are never read into a data
  point.
- Column map (documented in `docs/reference/collector-columns.md`): `index1`=site, `blob1`=site,
  `blob2`=name, `blob3`=country, `blob4`=device, `blob5`=source, `blob6`=schema version `'1'`,
  `blob7..blob10`=prop values in declared order, `double1`=1.
- Website server-side hook: new `website/functions/api/_events.ts` exporting
  `recordServerEvent(context, event)` (fire-and-forget via `waitUntil`, 2 s timeout, silently off
  when `LVBT_EVENTS_SECRET` is unset, skipped when the incoming request carries `Sec-GPC: 1`).
  Called after the Beehiiv success in `functions/api/subscribe.ts` and after the Notion success in
  `functions/api/membership-intake.ts`. Set the secret as a Pages Secret; generate with
  `openssl rand -hex 32`.

### Reporting a volunteer can use (`tools/report`)

- `pnpm report [--days 7|30] [--json]` runs four fixed SQL queries (totals per site per event, per
  day, per first prop, device/country mix) against the Analytics Engine SQL API using
  `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_ANALYTICS_READ_TOKEN` and prints a Markdown table.
- `.github/workflows/weekly.yml` (Mondays): runs `lvbt-analytics verify` against all four production
  hosts, then `pnpm report` for 7 and 30 days, and upserts one pinned issue labelled
  `analytics-report`. Failures open an issue labelled `analytics, maintenance` (mirrors the
  website's `audit-scheduled.yml`). Grafana Cloud is documented as an optional later add-on.

## Configuration contract (documented once, in `analytics/docs/reference/configuration.md`)

| Item                           | Value                                                                                                                                                                                        |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CWA token variable, everywhere | `PUBLIC_LVBT_CWA_TOKEN` (org-level GitHub Actions **variable**, not a secret; the value ships in HTML). Astro reads `PUBLIC_*` natively; Vite apps add `envPrefix: ['VITE_', 'PUBLIC_']`     |
| Where it is exported           | only the production build job `env:` of each repo's deploy workflow; never in CI/preview jobs (that absence is the preview gate)                                                             |
| Build guard                    | `LVBT_REQUIRE_ANALYTICS=1` in production build jobs: Astro integration throws if the token is empty; Vite workflows use `: "${PUBLIC_LVBT_CWA_TOKEN:?not set}"`                              |
| `site` ids                     | the hostnames: `lasvegasfortransit.org`, `labs.lasvegasfortransit.org` (home and every lab share it), `fund.lasvegasfortransit.org`, `map.lasvegasfortransit.org`                            |
| Collector                      | `https://events.lasvegasfortransit.org` baked into the package; override `PUBLIC_LVBT_ANALYTICS_COLLECTOR`                                                                                   |
| CSP additions, every site      | `script-src … https://static.cloudflareinsights.com`; `connect-src … https://cloudflareinsights.com https://events.lasvegasfortransit.org` (generated/checked by `lvbt-analytics csp --write | --check public/_headers`) |
| Secrets                        | `LVBT_EVENTS_SECRET` (collector Worker secret + website Pages Secret); `CLOUDFLARE_ANALYTICS_READ_TOKEN` (org secret restricted to the analytics repo)                                       |

Renames: website `PUBLIC_CWA_TOKEN` → `PUBLIC_LVBT_CWA_TOKEN` (`.env.example`,
`scripts/bootstrap/phases/env.ts:131`, docs); labs docs `CLOUDFLARE_WEB_ANALYTICS_TOKEN` →
`PUBLIC_LVBT_CWA_TOKEN` (`docs/security/reference/secrets.md:13`).

## Documentation plan (Diátaxis; bar = `website/docs/standards/writing-docs.md`)

Every page opens with what + why, lists prerequisites, defines jargon once with a glossary link,
shows real commands with expected output, explains errors, and says which option to pick.

In the analytics repo (`docs/README.md` indexes by quadrant):

- `README.md` start here: three-sentence what, five-bullet privacy promise, "pick your framework"
  table, one Astro and one Vite snippet, links to allowlist, privacy contract, runbook.
- Tutorial `docs/tutorials/add-analytics-to-a-new-lvbt-site.md` (10 minutes, eight steps: create CWA
  site is already done, add nothing to GitHub because the org variable exists, install, wire,
  `csp --write`, export the variable + guard in the deploy workflow, `verify` on preview then prod,
  add the per-site doc page). Common errors section.
- How-to: `add-a-conversion-event.md`, `rotate-the-cwa-token.md`, `rotate-the-events-secret.md`,
  `verify-a-deployment.md`, `upgrade-consumers.md`, `read-the-weekly-report.md`,
  `runbook-dashboard-shows-zero.md` (decision list: no-token / CSP blocked / preview gate /
  collector `/health` / your own GPC / dashboard delay).
- Reference: `api.md`, `cli.md`, `event-allowlist.md` (generated by
  `lvbt-analytics events --markdown`, drift-checked in CI), `privacy-contract.md` (what CWA
  collects, what the collector collects, retention, the never-collected list, signals honored),
  `csp-requirements.md`, `configuration.md`, `collector-columns.md`, `glossary.md` (beacon, CSP,
  GPC, DNT, UTM, RUM, Core Web Vitals, Analytics Engine, collector, provenance, trusted publishing;
  same anchor style as the website).
- Explanation: `why-cwa-plus-a-first-party-collector.md` (alternatives: GA4, Plausible, Fathom,
  Counterscale, nothing), `how-production-only-gating-works.md`, `architecture.md`.
- Public copy `docs/public/privacy.md`: the shared privacy page text (website renders it at
  `/privacy`; other sites link there). Draft exists in the design; confirm the contact address.
- `docs/superpowers/specs/2026-09-01-analytics-standard-design.md`: this plan, saved as the design
  record (brainstorming-skill convention).

Per consumer, one reference page `docs/.../analytics.md` (website: `docs/reference/analytics.md`;
others: `docs/operations/reference/analytics.md`) covering: what is measured and which dashboard,
where the hook lives, which variable and workflow line, excluded paths, events this site fires and
where, the `verify` command, link to the analytics repo. Plus index and glossary updates.

## Implementation steps

Each numbered step is one PR in one repo. Order matters: the package must publish before consumers.

### Step 0. Prerequisites (maintainer, dashboard work; document each in the runbooks)

1. Create the GitHub repo `LasVegasForTransit/analytics` and add it (plus `labs`, `transit-funding`
   once pushed) to `repository-tooling/standards/repositories.json`.
2. Claim the `lvbt` npm org; first publish may need a manual granular token, then configure npm
   trusted publishing for `release.yml`.
3. Cloudflare: Web Analytics → add site `lasvegasfortransit.org` with the **manual JS snippet**
   (turn automatic setup off; it would double count and bypass our gates). Copy the token to an
   org-level GitHub variable `PUBLIC_LVBT_CWA_TOKEN`. Create an API token "Account Analytics: Read"
   → org secret `CLOUDFLARE_ANALYTICS_READ_TOKEN` restricted to the analytics repo. Add DNS/custom
   domain `events.lasvegasfortransit.org` on deploy.

### Step 1. Analytics repo v0.1.0

- Scaffold per the layout above, copying `website/.github/actions/setup-node-pnpm`, renovate config,
  `.githooks`, `.lvbt/`, and `plugins/lvbt-contributions/` from the website repo.
- Implement `gate.ts`, `events.ts`, `csp.ts`, `init.ts`, `client.ts`, `react.tsx`, `astro/index.ts`,
  `testing/`, `node/`, `cli/` (`verify`, `csp`, `events`, `client`).
- Implement `apps/collector` (handler, zod validation from `EVENTS`, columns, CORS, `/health`) with
  `@cloudflare/vitest-pool-workers` tests (mirror `transit-mapper/apps/worker/vitest.config.ts`).
- Implement `tools/report`.
- Write all docs listed above. `pnpm check` = lint, typecheck, unit tests, build, size budget,
  publint, docs links, e2e on fixtures, `wrangler deploy --dry-run`.
- Deploy the collector, run the curl matrix (204 / 400 / 403 / 413 / 429 / GPC-no-write / bearer),
  publish the package, enable `weekly.yml`.

### Step 2. Website (fixes the current bug)

- `astro.config.mjs`: add `lvbtAnalytics({ site: 'lasvegasfortransit.org' })` to `integrations`;
  delete the beacon block in `src/layouts/BaseLayout.astro:174-194`.
- `.github/workflows/deploy-production.yml` build job `env:`: add
  `PUBLIC_LVBT_CWA_TOKEN: ${{ vars.PUBLIC_LVBT_CWA_TOKEN }}` and `LVBT_REQUIRE_ANALYTICS: '1'`; also
  add the missing `PUBLIC_LVBT_NEWSLETTER_URL` and `PUBLIC_LVBT_NEWSLETTER_FEED_URL` (same bug
  class). Add a `smoke` job after deploy:
  `pnpm exec lvbt-analytics verify https://lasvegasfortransit.org --site lasvegasfortransit.org --expect present`.
- `.github/workflows/deploy-preview.yml` headers-check job: add
  `verify "$PREVIEW_URL" … --expect absent`.
- `.github/workflows/ci.yml` Validate: `pnpm exec lvbt-analytics csp --check public/_headers`.
- `public/_headers`: add `https://events.lasvegasfortransit.org` to `connect-src`.
- Rename the env var in `.env.example`, `scripts/bootstrap/phases/env.ts:131`, and fix
  `docs/reference/deployment-pipeline.md:47-52` (GitHub variables, not the Pages dashboard).
- Conversions: `data-lvbt-event="join_click" data-lvbt-placement="header"` on
  `src/components/site/Header.astro:65`; `join_click`/`donate_click` with `placement="footer"` on
  `Footer.astro:190,198`; `placement="hero"` on the `/join` CTA. Server-side: new
  `functions/api/_events.ts`; calls in `subscribe.ts` and `membership-intake.ts`;
  `LVBT_EVENTS_SECRET` in `.env.example` and as a Pages Secret. Add
  `"test:functions": "node --test tests/*.test.ts"` and run it in
  `.github/actions/build-site/action.yml` (the existing `tests/membership-intake.test.ts` runs
  nowhere today); extend it to assert the collector call with and without the secret.
- `/privacy`: `src/pages/privacy.astro` rendering a vendored copy of
  `analytics/docs/public/privacy.md` with a "canonical lives in analytics repo" comment; footer
  link; sitemap. Fix `docs/reference/newsletter-ops.md:64-68` (Beehiiv, not Ghost).
- `tests/analytics.spec.ts` in the `ui-contracts` project using `@lvbt/analytics/testing`: served as
  production → one beacon request, join click → one `join_click` POST; served from localhost → zero
  requests.
- Docs: `docs/reference/analytics.md`; shorten the RUM section of
  `docs/standards/performance-monitoring.md` to point there; glossary and index entries.
- Measure `pnpm check:baseline`; bump `perf-budgets.json` `jsGzipKb` to 13 only if needed.

### Step 3. Labs

- `pnpm-workspace.yaml` catalog: `'@lvbt/analytics': <exact>`; `turbo.json`
  `globalEnv: ["PUBLIC_LVBT_CWA_TOKEN", "LVBT_REQUIRE_ANALYTICS"]` (prevents a cached token-less
  build being replayed).
- `packages/brand`: first JS exports `./analytics` (`LABS_SITE`, `initLabsAnalytics()` which
  dynamically imports `@lvbt/analytics` only when the token is set) and `./analytics/astro`
  (`labsAnalytics()` wrapping the integration); `dependencies: { '@lvbt/analytics': 'catalog:' }`;
  `env.d.ts`; `tests/analytics.test.ts`. This honors
  `docs/development/reference/brand-and-ui.md:55`.
- `apps/home/astro.config.ts`: `integrations: [sitemap(), labsAnalytics()]`.
  `apps/transit-funding/vite.config.ts`: `envPrefix: ['VITE_', 'PUBLIC_']`; `src/main.tsx`:
  `void initLabsAnalytics()` before `createRoot`.
- Archive builds: both `build:archive` scripts run with `PUBLIC_LVBT_CWA_TOKEN=` (empty); new
  `tooling/src/check-archive.ts` fails `pnpm check` if any file under `apps/*/dist-archive` contains
  `cloudflareinsights` or the collector host; `.env.example` per app.
- `eslint.config.ts`: `no-restricted-imports` for `apps/**` forbidding direct `@lvbt/analytics`
  (message: use `@lvbt/brand/analytics`).
- `public/_headers` per app with the standard CSP block (labs docs already require one; separable
  into its own PR if it causes churn). The JSON-LD `<script type="application/ld+json">` is data and
  passes `script-src 'self'`.
- Docs: `docs/operations/reference/analytics.md`; update `deployment.md:75-81`, `secrets.md:13`,
  `brand-and-ui.md`, `checks.md`; `AGENTS.md` invariants row "production builds carry the shared
  analytics hook; local, preview, and archive builds contain no analytics endpoint". Note that
  `pnpm doctor` analytics checks remain unimplemented and what "verify" should mean there.
- e2e: `apps/home/tests/e2e/analytics.test.ts` and the transit-funding equivalent (prod host →
  beacon present; archive dist → nothing).
- When the labs deploy workflow is created (it does not exist yet), export the variable + guard and
  run `verify --expect present` after deploy.

### Step 4. TransitFunding (standalone)

- `apps/web/public/_headers`:
  `script-src 'self' https://static.cloudflareinsights.com; connect-src 'self' https://cloudflareinsights.com https://events.lasvegasfortransit.org`
  (via `csp --write`). This one line unblocks both the beacon and the collector.
- `apps/web/vite.config.ts` `envPrefix`; `apps/web/src/main.tsx`
  `init({ site: 'fund.lasvegasfortransit.org', token: import.meta.env.PUBLIC_LVBT_CWA_TOKEN })`;
  `vite-env.d.ts`; catalog + dependency; `.env.example`.
- `tool_feature_used { feature: 'fuel_lever_moved' }` at the single "user moved the lever" call site
  (likely `useSceneState.ts` or `fuel-lever.ts`; locate during implementation).
- `.github/workflows/deploy-production.yml` build step env + shell guard; append
  `verify "$SITE" --site fund.lasvegasfortransit.org --expect present` to the existing smoke test
  (line ~289). `ci.yml`: `csp --check`.
- Docs: `docs/operations/reference/analytics.md` noting the labs copy is canonical.
- Incidental: `package.json` `build` points at `apps/web/scripts/run-build.ts` which does not exist;
  fix or flag in the same PR since deploy depends on it.

### Step 5. TransitMapper

- `apps/web/src/main.tsx`:
  `init({ site: 'map.lasvegasfortransit.org', token: …, exclude: [/^\/e\//], noPageviews: [/^\/s\//] })`.
  `src/embed/main.ts` and `embed.html` untouched: the embed is its own entry and never imports the
  package (primary guarantee); the `framed` gate is the second. Share pages get no pageview (the id
  is in the path) but may fire `tool_feature_used { feature: 'share_opened' }` after `fetchShare`
  resolves.
- Events: `share_created` after a successful publish, `export_png|svg|json` in `ExportDialog.tsx`,
  `gtfs_import` in `GtfsImportDialog.tsx` (call sites to pin down during implementation).
- `_headers` CSP stays `frame-ancestors 'none'`; hardening it needs a basemap tile-host inventory
  and is a separate initiative. `csp --check` passes with a note.
- `vite.config.ts` `envPrefix`; catalog + dependency; `.env.example`; bundle report absorbs ~1 KB.
- `.github/workflows/deploy-production.yml`: env + guard + `verify … --expect present` and
  `verify "$SITE/e/<missing>" --expect absent`.
- Docs: `docs/operations/reference/analytics.md`; one paragraph in
  `docs/product/explanation/sharing-surfaces.md`; reword `ROADMAP.md:130-137` to distinguish site
  analytics (this standard) from the still-future opt-in performance telemetry; `secrets.md` row.
- e2e: `/e/:id` → zero analytics requests; `/s/:id` → zero beacon, one `share_opened`.

## Verification

| Layer                     | What proves it                                                                                                                                                                                                                                                                                             |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit (analytics repo)     | table-driven `shouldEnable` for every reason; `EVENTS` validation rejects unknown names, extra keys, non-enum values; `csp.merge` idempotent; `init` idempotent under React StrictMode; `dependencies` empty; collector handler tests assert `writeDataPoint` call counts (1 valid, 0 for GPC/400/403/429) |
| Size                      | `check-size.ts` in the analytics repo; website `bundle-size.ts` 12 KB budget; TransitMapper `report-bundle.ts`                                                                                                                                                                                             |
| Browser (each consumer)   | Playwright with `@lvbt/analytics/testing`: production host → exactly one `beacon.min.js` request and one `/e` POST with the exact JSON on the conversion; localhost/preview/archive/framed/GPC → zero requests; no cookies or storage written                                                              |
| Static (each consumer CI) | `lvbt-analytics csp --check public/_headers`; labs `check:archive` grep                                                                                                                                                                                                                                    |
| Deploy smoke              | `verify … --expect present` on production, `--expect absent` on website previews and TransitMapper embeds; the Astro integration/shell guard fails the build if the token is missing                                                                                                                       |
| Live, weekly              | `weekly.yml` verifies all four hosts and publishes the report issue                                                                                                                                                                                                                                        |
| Manual, once              | after Step 2 deploy: DevTools Network shows `beacon.min.js` 200 and a `/cdn-cgi/rum` POST; CWA dashboard shows the host within minutes; `pnpm report --days 1` shows a `newsletter_signup` after a test subscribe                                                                                          |

## Open items and flags

- Unverified APIs to confirm during Step 1: tsdown `banner` option for the CLI shebang; Astro 6
  `injectScript('page', …)` still emits an external module and `updateConfig({ vite })` merges;
  whether the CWA dashboard breaks down UTM parameters (if not, campaign attribution is limited to
  referrer data; a first-party campaign event would need an enum of known campaign slugs).
- Analytics Engine writes are not persisted under local `wrangler dev`; confirm one real write with
  `wrangler dev --remote`.
- Whether npm trusted publishing can be configured before the first publish (budget one manual
  publish).
- `labs` and `transit-funding` have no GitHub remote yet; their CI injection lands when they are
  pushed.
- Confirm the contact address used in the public privacy page copy.
- Should GPC also suppress server-side conversion counting? This plan says yes (the Pages Function
  forwards the signal) for consistency; revisit if the numbers matter more than the symmetry.
