# Event allowlist

The collector accepts only these events and enum values. Text labels, URLs, coordinates, search
terms, share identifiers, and arbitrary campaign values do not belong in an analytics event.

<!-- generated-events:start -->

| Event               | Source | Sites                                                                                                                      | Properties                                                                                                                                                  |
| ------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `newsletter_signup` | server | `lasvegasfortransit.org`                                                                                                   | `method`: `site_form`, `membership_form`                                                                                                                    |
| `membership_intake` | server | `lasvegasfortransit.org`                                                                                                   | None                                                                                                                                                        |
| `join_click`        | client | `lasvegasfortransit.org`<br>`labs.lasvegasfortransit.org`<br>`fund.lasvegasfortransit.org`<br>`map.lasvegasfortransit.org` | `placement`: `header`, `footer`, `hero`, `inline`, `dialog`                                                                                                 |
| `donate_click`      | client | `lasvegasfortransit.org`<br>`labs.lasvegasfortransit.org`<br>`fund.lasvegasfortransit.org`<br>`map.lasvegasfortransit.org` | `placement`: `header`, `footer`, `hero`, `inline`, `dialog`                                                                                                 |
| `tool_feature_used` | client | `labs.lasvegasfortransit.org`<br>`fund.lasvegasfortransit.org`<br>`map.lasvegasfortransit.org`                             | `feature`: `share_created`, `share_opened`, `export_png`, `export_svg`, `export_json`, `gtfs_import`, `sim_started`, `fuel_lever_moved`, `scenario_changed` |

<!-- generated-events:end -->

Cloudflare Web Analytics owns pageviews, referrers, UTM attribution, and Core Web Vitals.
Duplicating those values as custom events creates a second, less reliable source of truth.
