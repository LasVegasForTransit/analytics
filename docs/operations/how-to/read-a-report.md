# Read an analytics report

The report command runs four fixed Analytics Engine queries for either 7 or 30 days.

```bash
pnpm report --days 7
pnpm report --days 30 --json
```

`CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_ANALYTICS_READ_TOKEN` must exist in the environment. The
token needs Account Analytics read permission and no write permission.

Totals answer how often each event occurred by site. The daily table reveals changes and outages.
The property table breaks events down by the first declared enum. Audience summarizes coarse country
and device classes.

Small counts are directional rather than individual-level evidence. The system intentionally has no
visitor or session identity, so it cannot calculate user funnels or returning-user rates.
