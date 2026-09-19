#!/usr/bin/env node
import { eventsMarkdown, checkCsp, verifyDeployment, writeClient, writeCsp } from './commands.js';

function value(args: string[], flag: string) {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
}

function usage(): never {
  throw new Error(
    'Usage: lvbt-analytics verify <url> --site <hostname> --expect present|absent | csp --check|--write <file> | events --markdown | client --out <file>',
  );
}

export async function run(args = process.argv.slice(2)) {
  const [command, operand] = args;
  switch (command) {
    case 'events':
      if (!args.includes('--markdown')) usage();
      process.stdout.write(eventsMarkdown());
      return;
    case 'csp': {
      const checkPath = value(args, '--check');
      if (checkPath) {
        const errors = await checkCsp(checkPath);
        if (errors.length > 0) throw new Error(errors.join('\n'));
        return;
      }
      await writeCsp(value(args, '--write') ?? usage());
      return;
    }
    case 'client':
      await writeClient(value(args, '--out') ?? usage());
      return;
    case 'verify': {
      if (!operand) usage();
      const site = value(args, '--site') ?? usage();
      const expectation = value(args, '--expect');
      if (expectation !== 'present' && expectation !== 'absent') usage();
      await verifyDeployment(operand, site, expectation);
      return;
    }
    default:
      usage();
  }
}

run().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
