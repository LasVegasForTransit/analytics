# Rotate the Web Analytics token

Token rotation changes the public site token without enabling analytics in previews.

1. Create the replacement manual Web Analytics site token for `lasvegasfortransit.org` in
   Cloudflare. Automatic injection stays disabled.
2. Replace the GitHub organization variable `PUBLIC_LVBT_CWA_TOKEN`.
3. Run each production deployment through its normal validated `main` workflow.
4. Verify each hostname with `lvbt-analytics verify <url> --expect present`.
5. Confirm new pageviews in the Cloudflare host breakdown.
6. Remove the previous Web Analytics site after every production hostname reports through the new
   token.

Preview workflows remain unchanged and continue to prove absence.
