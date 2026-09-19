# Rotate the collector secret

The collector secret authenticates server-originated website events. Browser events do not use it.

1. Generate a replacement with `openssl rand -hex 32`.
2. Update `LVBT_EVENTS_SECRET` on the collector Worker.
3. Update the same encrypted secret on every server sender.
4. Deploy the collector and send one authenticated test event from the website preview environment.
5. Deploy the website, complete a real test submission, and confirm a server event in the report.
6. Remove the old value from maintainer secret storage.

Cloudflare secret values are write-only. Rotation starts from a newly generated value rather than
attempting to recover the existing one.
