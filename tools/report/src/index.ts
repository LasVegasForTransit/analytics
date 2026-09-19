import { fetchReport, reportMarkdown } from './report.js';
import type { ReportDays } from './queries.js';

function option(args: string[], flag: string) {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
}

export async function run(args = process.argv.slice(2)) {
  const daysValue = option(args, '--days') ?? '7';
  if (daysValue !== '7' && daysValue !== '30') throw new Error('--days must be 7 or 30.');
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_ANALYTICS_READ_TOKEN;
  if (!accountId || !token)
    throw new Error('CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_ANALYTICS_READ_TOKEN are required.');
  const days = Number(daysValue) as ReportDays;
  const report = await fetchReport(days, { accountId, token });
  process.stdout.write(
    args.includes('--json') ? `${JSON.stringify(report, null, 2)}\n` : reportMarkdown(report, days),
  );
}

run().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
