# Client API

`@lvbt/analytics` has no runtime dependencies. The package exposes a browser client, framework
adapters, browser-test helpers, and a Node helper for static headers.

## `init(options)`

`init` evaluates the privacy and environment gate once, installs Cloudflare Web Analytics when
pageviews are enabled, and returns a typed event function.

```ts
const analytics = init({
  site: 'labs.lasvegasfortransit.org',
  token: import.meta.env.PUBLIC_LVBT_CWA_TOKEN,
  collector: 'https://events.lasvegasfortransit.org',
  exclude: [/^\/retired\//],
  noPageviews: [/^\/private-share\//],
  spa: true,
  clicks: true,
});
```

`exclude` disables all measurement on matching paths. `noPageviews` suppresses the Cloudflare beacon
while preserving allowlisted conversion events. `spa` defaults to `true`; `clicks` defaults to
`true`.

Cloudflare's automatic soft-navigation tracking remains enabled when `exclude` or `noPageviews` is
configured. The client filters Cloudflare Web Analytics requests against those rules, preserving
pageviews for allowed routes while suppressing pageviews for matching initial and soft-navigation
paths. Custom events recheck `exclude` against the current path before every send.

The returned handle contains `enabled`, an optional gate `reason`, and `track(name, props)`. Calling
`init` again returns the first handle and does not install another beacon or click listener.

## Production gate

`shouldEnable(input)` returns `{ enabled: true }` or a disabled result. Reasons are evaluated in
this order:

1. `no-token`
2. `gpc`
3. `dnt`
4. `framed`
5. `excluded-path`
6. `localhost`
7. `preview-host`
8. `hostname-mismatch`

Preview hosts include `*.pages.dev` and `*.workers.dev`. Framed pages stay off even when the parent
page shares the same origin.

## Events

`track` accepts only names and enum properties from `EVENTS`. Identical payloads are sent once per
page load. The client uses `navigator.sendBeacon` first and a keepalive `fetch` fallback.

HTML elements use the same typed contract without application code:

```html
<a href="/join" data-lvbt-event="join_click" data-lvbt-placement="header">Join</a>
```

Unknown names, property keys, and enum values are ignored by delegated click tracking and rejected
by direct `track` calls.

## Framework entry points

`@lvbt/analytics/astro` exports `lvbtAnalytics(options)`. It reads the standard environment, injects
an external page module only when a token exists, and disables JavaScript asset inlining so the site
CSP remains enforceable.

`@lvbt/analytics/react` exports `Analytics`, `useAnalytics`, and `useTrack`. The provider
initializes the shared client after mount. Hooks return the disabled no-op handle during server
rendering and the first client render.

`@lvbt/analytics/client` exports `initFromScript`. It reads `data-lvbt-site`, `data-lvbt-token`,
`data-lvbt-collector`, `data-lvbt-spa`, and `data-lvbt-clicks` from a script element.

## Test and Node entry points

`@lvbt/analytics/testing` exports `captureBeacon(page)`, `captureEvents(page, collector)`, and
`serveAsProduction(localOrigin, site)`. The capture helpers install Playwright-compatible routes and
return arrays populated as requests occur. `serveAsProduction` returns the production URL and
Chromium host-resolver argument needed to exercise the hostname gate against a loopback server.

`@lvbt/analytics/node` exports `checkHeadersFile(path, collector)`. It returns every missing CSP
origin from every `Content-Security-Policy` line in a Cloudflare `_headers` file.
