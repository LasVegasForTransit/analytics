# Production-only gating

Analytics exclusion is enforced at build time, in the browser, and at the collector. No single
hostname convention or workflow condition carries the full privacy boundary.

Production workflows export `PUBLIC_LVBT_CWA_TOKEN` and `LVBT_REQUIRE_ANALYTICS=1`. The Astro
integration injects its page module only when the token exists; the guard turns a missing production
token into a build failure. Vite entry points receive the token through the same production-only
environment.

The browser then verifies the exact site hostname. Localhost, loopback addresses, `*.pages.dev`,
`*.workers.dev`, framed documents, excluded paths, GPC, and DNT return a disabled handle before the
Cloudflare script or collector listener is installed.

Preview workflows prove absence with:

```bash
pnpm exec lvbt-analytics verify "$PREVIEW_URL" --expect absent
```

Production workflows use `--expect present`. Retired archive builds omit the token and run the
absence check before publication.
