# Upgrade consumer repositories

Package upgrades move through one consumer at a time so a shared client change has a clear runtime
proof.

1. Read the package release notes and privacy-contract diff.
2. Update the pinned package version and lockfile without changing unrelated dependencies.
3. Run the consumer's `pnpm check` and production build with the analytics guard enabled.
4. Deploy the normal pull-request preview and prove `--expect absent`.
5. Exercise every event emitted by that consumer with the browser capture helpers.
6. Merge through the repository's required review flow.
7. Verify the production hostname with `--expect present` and check the collector health endpoint.

Update Labs first when the release changes its shared Astro hook, then TransitFunding,
TransitMapper, and the main website. A consumer with a failed preview or production proof remains on
the prior package version.
