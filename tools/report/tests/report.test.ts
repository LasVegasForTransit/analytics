import { expect, test, vi } from 'vitest';
import { reportQueries } from '../src/queries.js';
import { fetchReport, reportMarkdown } from '../src/report.js';

test('uses fixed sampled-count queries for supported windows', () => {
  const queries = Object.values(reportQueries(7));
  expect(queries).toHaveLength(4);
  for (const query of queries) {
    expect(query).toContain('SUM(_sample_interval)');
    expect(query).toContain("INTERVAL '7' DAY");
    expect(query.endsWith('FORMAT JSON')).toBe(true);
  }
});

test('fetches each report section and renders markdown', async () => {
  const request = vi.fn(() =>
    Promise.resolve(Response.json({ data: [{ site: 'labs.lasvegasfortransit.org', total: 3 }] })),
  );
  const report = await fetchReport(30, { accountId: 'account', token: 'token' }, request);
  expect(request).toHaveBeenCalledTimes(4);
  expect(reportMarkdown(report, 30)).toContain('# LVBT analytics: 30 days');
  expect(reportMarkdown(report, 30)).toContain('| labs.lasvegasfortransit.org | 3 |');
});
