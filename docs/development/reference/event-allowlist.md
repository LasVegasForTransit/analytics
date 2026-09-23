# Event allowlist

The collector accepts only these events and enum values. Text labels, URLs, coordinates, search
terms, share identifiers, and arbitrary campaign values do not belong in an analytics event.

<!-- generated-events:start -->

| Event                  | Source | Sites                                                                                                                      | Properties                                                                                                                                                  |
| ---------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `newsletter_signup`    | server | `lasvegasfortransit.org`                                                                                                   | `method`: `site_form`, `membership_form`                                                                                                                    |
| `membership_intake`    | server | `lasvegasfortransit.org`                                                                                                   | None                                                                                                                                                        |
| `join_click`           | client | `lasvegasfortransit.org`<br>`labs.lasvegasfortransit.org`<br>`fund.lasvegasfortransit.org`<br>`map.lasvegasfortransit.org` | `placement`: `header`, `footer`, `hero`, `inline`, `dialog`                                                                                                 |
| `donate_click`         | client | `lasvegasfortransit.org`<br>`labs.lasvegasfortransit.org`<br>`fund.lasvegasfortransit.org`<br>`map.lasvegasfortransit.org` | `placement`: `header`, `footer`, `hero`, `inline`, `dialog`                                                                                                 |
| `tool_feature_used`    | client | `labs.lasvegasfortransit.org`<br>`fund.lasvegasfortransit.org`<br>`map.lasvegasfortransit.org`                             | `feature`: `share_created`, `share_opened`, `export_png`, `export_svg`, `export_json`, `gtfs_import`, `sim_started`, `fuel_lever_moved`, `scenario_changed` |
| `campaign_signup`      | client | `lvwwd.org`                                                                                                                | None                                                                                                                                                        |
| `week_link_requested`  | client | `lvwwd.org`                                                                                                                | `method`: `link_form`, `signup_form`                                                                                                                        |
| `trip_entry_submitted` | client | `lvwwd.org`                                                                                                                | `day`: `1`, `2`, `3`, `4`, `5`, `6`, `7`, `8`<br>`method`: `link`, `screenshot`, `link_and_screenshot`                                                      |
| `trip_picture_shared`  | client | `lvwwd.org`                                                                                                                | `method`: `share_sheet`, `download`                                                                                                                         |
| `bingo_square_marked`  | client | `lvwwd.org`                                                                                                                | `marked`: `1`, `2`, `3`, `4`, `5`, `6`, `7`, `8`, `9`, `10`, `11`, `12`, `13`, `14`, `15`, `16`, `17`, `18`, `19`, `20`, `21`, `22`, `23`, `24`             |
| `bingo_completed`      | client | `lvwwd.org`                                                                                                                | `lines`: `1`, `2`, `3`, `4`, `5`, `6`, `7`, `8`, `9`, `10`, `11`, `12`                                                                                      |
| `bus_finder_used`      | client | `lvwwd.org`                                                                                                                | `method`: `my_location`, `place`                                                                                                                            |
| `app_installed`        | client | `lvwwd.org`                                                                                                                | `method`: `browser`, `home_screen`                                                                                                                          |
| `material_printed`     | client | `lvwwd.org`                                                                                                                | `item`: `partner_flyer`, `bingo_card`                                                                                                                       |
| `mail_in_viewed`       | client | `lvwwd.org`                                                                                                                | None                                                                                                                                                        |

<!-- generated-events:end -->

## lvwwd.org campaign events

lvwwd.org, the Week Without Driving Las Vegas campaign site, counts the steps of its campaign. Every
value is a day of the week, a running count, or a fixed label, so no event says who a person is,
what they wrote, or where they were.

| Event                  | Sent when                                                                                               | Properties                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `campaign_signup`      | A new sign-up is saved                                                                                  | None                                                                                                         |
| `week_link_requested`  | Someone asks for their "Open my week" link                                                              | `method`: the Get my link form, or a sign-up that already existed                                            |
| `trip_entry_submitted` | A day's trip entry is saved                                                                             | `day`: the campaign day, 1 to 8; `method`: a post link, a screenshot, or both. The link itself is never sent |
| `trip_picture_shared`  | The trip picture goes to the phone's share sheet or is downloaded                                       | `method`: `share_sheet` or `download`                                                                        |
| `bingo_square_marked`  | A bingo square is marked                                                                                | `marked`: how many squares are marked now, 1 to 24                                                           |
| `bingo_completed`      | Marking a square finishes a line                                                                        | `lines`: how many lines are complete now, 1 to 12; 12 is the whole card                                      |
| `bus_finder_used`      | Find a bus lists stops                                                                                  | `method`: the phone's location or a chosen place. The location itself is never sent                          |
| `app_installed`        | The browser reports an install, or the site first opens from the home screen where browsers report none | `method`: `browser` or `home_screen`                                                                         |
| `material_printed`     | A print starts on the partner flyer or the paper bingo card                                             | `item`: `partner_flyer` or `bingo_card`                                                                      |
| `mail_in_viewed`       | The enter-by-mail instructions come into view                                                           | None                                                                                                         |

Cloudflare Web Analytics owns pageviews, referrers, UTM attribution, and Core Web Vitals.
Duplicating those values as custom events creates a second, less reliable source of truth.
