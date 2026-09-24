# Set up the analytics production

This guide sets up everything the analytics repository needs in production, starting from nothing:
the GitHub `production` environment, the two Cloudflare tokens, the collector Worker at
`events.lasvegasfortransit.org` with its secret, and the weekly report. Every step starts by
checking whether it is already done, so you can follow the guide again at any time; a step that is
done is skipped, and nothing is replaced unless a step says so. Replacing a value on purpose is
covered in [Rotate the collector secret](rotate-the-events-secret.md).

Once this repository moves to repository tooling 0.4.2 or later, a `platform.json` and
`pnpm bootstrap --production` will check and set up most of this for you, and this guide will point
to them.

## Before you start

- `pnpm bootstrap` passes on your machine, so the GitHub CLI and Wrangler are signed in.
- You are an admin of `LasVegasForTransit/analytics`, so you can create environments and secrets.
- You have the Super Administrator role on the LVBT Cloudflare account, "Las Vegans for Better
  Transit" (ID `2557b5c2e166292ded0f8425b73075e9`), because the tokens below belong to that account
  rather than to you. Everything here is created in that account, never in a personal one.

Never paste a token or secret into a command line or a chat. Each step below pastes it into a prompt
that hides it, or into a GitHub or Cloudflare field.

## 1. Create the GitHub environment

The collector's Deploy workflow reads its secrets from an environment named `production`.

1. Check: open the repository's Settings, then Environments. If `production` is listed, go to
   step 2.
2. Click "New environment", type `production`, and click "Configure environment".

## 2. Store the account ID

The account ID is not secret, but both workflows read it as a secret, in two places: the
`production` environment (for the Deploy workflow) and the repository itself (for the weekly report,
which runs without an environment). Check first:

```bash
gh secret list --env production
gh secret list
```

For each list that lacks `CLOUDFLARE_ACCOUNT_ID`, run the matching command and paste
`2557b5c2e166292ded0f8425b73075e9` at its prompt:

```bash
gh secret set CLOUDFLARE_ACCOUNT_ID --env production
gh secret set CLOUDFLARE_ACCOUNT_ID
```

## 3. Create the deploy token

The Deploy workflow uses `CLOUDFLARE_API_TOKEN` in the `production` environment to publish the
collector Worker and attach its custom domain. If `gh secret list --env production` already shows
`CLOUDFLARE_API_TOKEN`, skip this section.

It is an account API token, so deploys keep working after the person who made it leaves. Wrangler
accepts it because the workflow also sets `CLOUDFLARE_ACCOUNT_ID`.

1. In the Cloudflare dashboard, choose "Las Vegans for Better Transit" and go to Manage Account,
   then "Account API Tokens"
   (<https://dash.cloudflare.com/2557b5c2e166292ded0f8425b73075e9/api-tokens>). Click "Create
   Token", then "Create Custom Token".
2. Name it `analytics collector deploy (GitHub Actions)`.
3. Under "Permissions", add these rows: "Account", "Workers Scripts", "Edit" (uploads the Worker and
   attaches its custom domain); "Account", "Account Settings", "Read"; "Zone", "Zone", "Read" (finds
   the zone for the custom domain); and "Zone", "Workers Routes", "Edit".
4. Under "Zone Resources", choose "Include", then "Specific zone", then `lasvegasfortransit.org`.
5. Leave the expiration empty, so deploys keep working. Click "Continue to summary", then "Create
   Token".
6. Run `gh secret set CLOUDFLARE_API_TOKEN --env production` in a terminal and leave it waiting at
   its prompt.
7. Copy the token (Cloudflare shows it only once), paste it at that prompt, and press Enter.

## 4. Create the report token

The weekly report reads the collector's Analytics Engine data through Cloudflare's SQL API with
`CLOUDFLARE_ANALYTICS_READ_TOKEN`, a repository secret. It can read analytics and nothing else. If
`gh secret list` already shows `CLOUDFLARE_ANALYTICS_READ_TOKEN`, skip this section.

1. On the same "Account API Tokens" page, click "Create Token", then "Create Custom Token".
2. Name it `analytics weekly report (GitHub Actions)`.
3. Under "Permissions", add one row: "Account", "Account Analytics", "Read". Add nothing else.
4. Leave the expiration empty, click "Continue to summary", then "Create Token".
5. Run `gh secret set CLOUDFLARE_ANALYTICS_READ_TOKEN` and leave it waiting at its prompt.
6. Copy the token, paste it at that prompt, and press Enter.

## 5. Deploy the collector and its custom domain

The collector's `apps/collector/wrangler.jsonc` declares `events.lasvegasfortransit.org` as a custom
domain. Deploying creates the domain's DNS record and certificate, and redeploying an unchanged
Worker changes nothing.

1. Check: open <https://events.lasvegasfortransit.org/health>. If it answers, go to section 6.
2. If the Cloudflare dashboard's DNS records for `lasvegasfortransit.org` already have a CNAME named
   `events`, delete it first: a custom domain cannot replace an existing CNAME.
3. In the repository's Actions tab, open "Deploy collector" and click "Run workflow" on `main`. It
   runs `pnpm check`, deploys, and then checks `/health`.

## 6. Set the collector secret

`LVBT_EVENTS_SECRET` lets a website's server prove that a conversion event came from it; browser
events do not use it. It is 32 random bytes written as 64 hexadecimal characters. Setup makes it
without ever showing it, and it never needs to be copied.

1. Check:

   ```bash
   pnpm --filter @lasvegasfortransit/analytics-collector exec wrangler secret list
   ```

   If `LVBT_EVENTS_SECRET` is listed, go to section 7. Do not set it again: a new value would lock
   out every server that sends events.

2. Make it and store it on the collector in one step, so it never appears on screen:

   ```bash
   openssl rand -hex 32 | pnpm --filter @lasvegasfortransit/analytics-collector exec wrangler secret put LVBT_EVENTS_SECRET
   ```

No website sends server events yet, so the collector is the only place that holds the value. When a
website first needs it, follow [Rotate the collector secret](rotate-the-events-secret.md): it makes
one new value and stores it on the collector and on that website together, because a stored value
cannot be read back to copy.

## 7. Turn on the weekly report

The weekly report runs every Monday only while the repository variable `LVBT_ANALYTICS_LIVE` is `1`.
It checks that each LVBT site still loads analytics and updates the pinned "LVBT analytics weekly
report" issue.

1. Check: run `gh variable list`. If `LVBT_ANALYTICS_LIVE` is `1`, go to step 3.
2. Run `gh variable set LVBT_ANALYTICS_LIVE --body 1`. The value is not secret.
3. In the Actions tab, open "Analytics weekly report" and click "Run workflow" once to confirm it
   passes.

## 8. Confirm

- <https://events.lasvegasfortransit.org/health> answers.
- `gh secret list --env production` shows `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`.
- `gh secret list` shows `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_ANALYTICS_READ_TOKEN`.
- `gh variable list` shows `LVBT_ANALYTICS_LIVE` set to `1`.
- The "LVBT analytics weekly report" issue has this week's date.

If a token ever leaks, roll it on the "Account API Tokens" page, run its `gh secret set` command,
and paste the new token at the prompt before doing anything else.
