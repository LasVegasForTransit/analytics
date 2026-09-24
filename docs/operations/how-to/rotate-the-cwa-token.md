# Rotate the Web Analytics token

Token rotation changes a site's public token without enabling analytics in previews. Cloudflare's
documented site controls do not include an in-place "regenerate token" action. Keep the current
property active until a replacement property and token are confirmed; do not delete it first.

1. Open the account's Web Analytics page (<https://dash.cloudflare.com/?to=/:account/web-analytics>
   with the LVBT account). Check that the existing property still reports pageviews. Click "Add a
   site" and try the same hostname — `lasvegasfortransit.org` for the shared organization property,
   or the site's own domain such as `lvwwd.org`. If Cloudflare does not permit another property for
   that hostname, stop and keep the existing property and token in place. Arrange a replacement path
   with Cloudflare before continuing.
2. If the replacement property was created, open "Manage site" on it and change automatic setup to
   "Enable with JS Snippet installation" (automatic injection stays disabled, same as the original
   site). Copy only the token inside `data-cf-beacon='{"token": "..."}'` (32 lowercase letters and
   digits): this is the replacement token.
3. Replace the value that held the old token: the shared property's token is the GitHub organization
   variable `PUBLIC_LVBT_CWA_TOKEN`
   (`gh variable set PUBLIC_LVBT_CWA_TOKEN --org LasVegasForTransit`); a site with its own property,
   such as `lvwwd.org`, keeps its token in that repository's `production` environment variable of
   the same name (`gh variable set PUBLIC_LVBT_CWA_TOKEN --env production`, run in that repository).
4. Run each production deployment through its normal validated `main` workflow.
5. Verify each hostname with `lvbt-analytics verify <url> --expect present`.
6. Confirm new pageviews in the Cloudflare host breakdown.
7. Remove the previous Web Analytics site after every production hostname reports through the new
   token.

Preview workflows remain unchanged and continue to prove absence.
