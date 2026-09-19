export type ReportDays = 7 | 30;

export function reportQueries(days: ReportDays) {
  const window = `timestamp > NOW() - INTERVAL '${days}' DAY`;
  return {
    totals: `SELECT blob1 AS site, blob2 AS event, SUM(_sample_interval) AS total FROM lvbt_events WHERE ${window} GROUP BY site, event ORDER BY site, event FORMAT JSON`,
    daily: `SELECT toDate(timestamp) AS day, blob1 AS site, blob2 AS event, SUM(_sample_interval) AS total FROM lvbt_events WHERE ${window} GROUP BY day, site, event ORDER BY day, site, event FORMAT JSON`,
    property: `SELECT blob1 AS site, blob2 AS event, blob7 AS property, SUM(_sample_interval) AS total FROM lvbt_events WHERE ${window} GROUP BY site, event, property ORDER BY site, event, property FORMAT JSON`,
    audience: `SELECT blob1 AS site, blob3 AS country, blob4 AS device, SUM(_sample_interval) AS total FROM lvbt_events WHERE ${window} GROUP BY site, country, device ORDER BY site, country, device FORMAT JSON`,
  } as const;
}
