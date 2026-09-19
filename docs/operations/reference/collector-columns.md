# Collector columns

The `lvbt_events` Analytics Engine dataset uses one stable schema. Reports query aliases rather than
numeric column names.

| Column                   | Meaning                                      |
| ------------------------ | -------------------------------------------- |
| `index1`                 | production site hostname; the sampling index |
| `blob1`                  | production site hostname                     |
| `blob2`                  | event name                                   |
| `blob3`                  | two-letter country code or `unknown`         |
| `blob4`                  | `mobile`, `desktop`, `unknown`, or `server`  |
| `blob5`                  | `client` or `server`                         |
| `blob6`                  | schema version, currently `1`                |
| `blob7` through `blob10` | event properties in declaration order        |
| `double1`                | event weight, currently `1`                  |

Counts use `SUM(_sample_interval)`, not `COUNT()`. Analytics Engine sampling represents multiple
original rows with one stored row; ignoring the interval undercounts busy sites.

Property order comes from `packages/analytics/src/events.ts`. An event change preserves existing
positions and appends new enum properties after them.
