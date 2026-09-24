# Documentation

These pages cover one shared analytics system. Tutorials teach an integration from beginning to end,
how-to guides solve a specific task, reference pages state exact contracts, and explanations record
design reasoning.

## Learn the system

- [Add analytics to an LVBT site](development/tutorials/add-analytics-to-a-new-site.md)
- [Set up a contributor checkout](development/tutorials/start-here.md)

## Complete a task

- [Add a conversion event](development/how-to/add-a-conversion-event.md)
- [Update the repository standard](development/how-to/update-the-repository-standard.md)
- [Upgrade consumer repositories](development/how-to/upgrade-consumers.md)
- [Set up the analytics production](operations/how-to/set-up-production.md)
- [Verify a deployment](operations/how-to/verify-a-deployment.md)
- [Read an analytics report](operations/how-to/read-a-report.md)
- [Rotate the Web Analytics token](operations/how-to/rotate-the-cwa-token.md)
- [Rotate the collector secret](operations/how-to/rotate-the-events-secret.md)
- [Restore a quiet dashboard](operations/runbooks/dashboard-shows-zero.md)

## Look up a contract

- [Client API](development/reference/api.md)
- [Command line](development/reference/cli.md)
- [Configuration](development/reference/configuration.md)
- [Content Security Policy](security/reference/csp-requirements.md)
- [Event allowlist](development/reference/event-allowlist.md)
- [Privacy contract](security/reference/privacy-contract.md)
- [Collector columns](operations/reference/collector-columns.md)
- [Glossary](development/reference/glossary.md)

## Understand the design

- [Architecture](development/explanation/architecture.md)
- [Production-only gating](development/explanation/production-only-gating.md)
- [Why Cloudflare Web Analytics and a first-party collector](development/explanation/why-two-paths.md)
- [Public privacy text](public/privacy.md)

The [analytics standard design](superpowers/specs/2026-09-01-analytics-standard-design.md) preserves
the original decision record. Current behavior belongs in the pages above.
