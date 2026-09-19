# Why two measurement paths

Cloudflare Web Analytics handles aggregate traffic and real-user performance without cookies. It
does not expose an application-defined event API, so it cannot answer whether a visitor selected a
join link, completed a membership intake, or used a tool feature.

The first-party collector fills only that narrow gap. Its enum-only schema prevents product code
from quietly sending text, URLs, coordinates, or identifiers. Analytics Engine keeps the service
inside the existing Cloudflare account and avoids a second browser tracker.

GA4 conflicts with the privacy posture and adds a broad advertising analytics surface. Hosted
privacy products such as Plausible and Fathom add another vendor while still needing a separate
event contract. A self-hosted dashboard adds operational work unrelated to LVBT's mission.
Collecting nothing removes evidence needed to improve public tools and understand whether calls to
action work.

The two-path design keeps commodity page measurement with Cloudflare and organization-specific
meaning in a small auditable Worker.
