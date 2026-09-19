import { reportQueries, type ReportDays } from './queries.js';

type Row = Record<string, string | number | null>;
type QueryName = keyof ReturnType<typeof reportQueries>;
export type Report = Record<QueryName, Row[]>;

function rows(value: unknown): Row[] {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('data' in value) ||
    !Array.isArray(value.data)
  )
    throw new Error('Cloudflare returned an unexpected Analytics Engine response.');
  return value.data as Row[];
}

export async function fetchReport(
  days: ReportDays,
  credentials: { accountId: string; token: string },
  request: typeof fetch = fetch,
): Promise<Report> {
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${credentials.accountId}/analytics_engine/sql`;
  const entries = await Promise.all(
    Object.entries(reportQueries(days)).map(async ([name, query]) => {
      const response = await request(endpoint, {
        body: query,
        headers: { Authorization: `Bearer ${credentials.token}` },
        method: 'POST',
      });
      if (!response.ok)
        throw new Error(`Analytics Engine query failed with HTTP ${response.status}.`);
      return [name, rows(await response.json())] as const;
    }),
  );
  return Object.fromEntries(entries) as Report;
}

function table(title: string, rows: Row[]) {
  if (rows.length === 0) return `## ${title}\n\nNo events recorded.\n`;
  const columns = Object.keys(rows[0] ?? {});
  return [
    `## ${title}`,
    '',
    `| ${columns.join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(row[column] ?? '')).join(' | ')} |`),
    '',
  ].join('\n');
}

export function reportMarkdown(report: Report, days: ReportDays) {
  return [
    `# LVBT analytics: ${days} days`,
    '',
    table('Totals', report.totals),
    table('By day', report.daily),
    table('By event property', report.property),
    table('Audience', report.audience),
  ].join('\n');
}
