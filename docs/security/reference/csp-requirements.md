# Content Security Policy requirements

Analytics needs two external origins. Sites keep their existing policy and add only these values:

```text
script-src https://static.cloudflareinsights.com
connect-src https://cloudflareinsights.com https://events.lasvegasfortransit.org
```

`static.cloudflareinsights.com` serves the Cloudflare Web Analytics module. `cloudflareinsights.com`
receives Web Analytics measurements. The LVBT collector receives allowlisted conversion events.

The package does not require `unsafe-inline`, `unsafe-eval`, wildcard sources, or a relaxed
`default-src`. The Astro integration forces JavaScript chunks into external assets so a strict
script policy remains effective.

Run the CSP checker after changing `_headers`:

```bash
pnpm exec lvbt-analytics csp --check public/_headers
```

Worker-generated responses do not inherit a static asset `_headers` file. A Worker that renders or
proxies HTML sets the same policy on its own response.
