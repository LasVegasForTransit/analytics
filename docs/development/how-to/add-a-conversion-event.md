# Add a conversion event

A conversion event represents a small, durable product action that cannot be answered with
pageviews. Confirm that the question needs a custom event before changing the allowlist.

1. Add one entry to `packages/analytics/src/events.ts`. Choose `client` or `server`, list the exact
   production sites, and use enum properties only. Name the event in lowercase snake case, such as
   `trip_entry_submitted`. Write each value as a short lowercase label or a small count, such as
   `screenshot` or `3`; a unit test rejects anything else.
2. Add valid and invalid cases to `packages/analytics/tests/events.test.ts` and the collector
   workerd suite.
3. Run `pnpm exec lvbt-analytics events --markdown` and update the event reference with the exact
   generated row.
4. Attach the event in each consumer. Prefer `data-lvbt-event` attributes for ordinary links and
   buttons; call `track` for stateful tool actions.
5. Run `pnpm check`, deploy a preview, and prove the preview sends no analytics.
6. Deploy production and confirm one row through `pnpm report --days 7`.

Reject a proposed property when its value contains free text, a URL, coordinates, a user or share
identifier, or enough detail to distinguish one person. Use a new bounded enum or answer the
question outside analytics.
