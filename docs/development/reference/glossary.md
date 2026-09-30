# Glossary

**Analytics Engine** is Cloudflare's append-oriented dataset for custom measurements. The LVBT
collector writes allowlisted events to the `lvbt_events` dataset.

**Beacon** is the Cloudflare Web Analytics browser module. It records aggregate page use and real
user performance.

**Content Security Policy (CSP)** is the response header that restricts scripts and network
destinations. Analytics adds two narrowly scoped external origins.

**Core Web Vitals** are browser performance measurements for loading, responsiveness, and visual
stability.

**Do Not Track (DNT)** is the browser request signal `DNT: 1`. LVBT treats it as an analytics
opt-out.

**Global Privacy Control (GPC)** is the browser privacy signal exposed as
`navigator.globalPrivacyControl` and `Sec-GPC: 1`. LVBT treats it as an analytics opt-out.

**Production gate** is the ordered check that disables analytics without a token, under a privacy
signal, in a frame, on excluded paths, on local and preview hosts, and on the wrong hostname.

**Real User Monitoring (RUM)** measures performance in actual browsers rather than a synthetic test.
Cloudflare Web Analytics supplies LVBT's RUM data.

**UTM parameters** are conventional campaign query parameters such as `utm_source`. Cloudflare Web
Analytics handles them; custom events do not copy them.

**Cloudflare CLI (`cf`)** builds and deploys the collector. Its typed configuration declares the
Worker, custom domain, Analytics Engine dataset, rate limit, and secret. **Wrangler** remains for
the local test pool, generated runtime types, and secret rotation during the CLI beta.

**pnpm** is the package manager pinned by the repository. **Turborepo** orders and caches scripts
across the client, collector, and report workspaces.
