import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
const root = path.resolve(fileURLToPath(new URL('../../../', import.meta.url)));
interface Task {
  taskId: string;
  dependencies: string[];
  command: string;
  resolvedTaskDefinition: { cache: boolean };
}
it('standard validation reaches the uncached analytics browser acceptance task', () => {
  const graph = JSON.parse(
    execFileSync('pnpm', ['exec', 'turbo', 'run', 'validate', '--dry=json'], {
      cwd: root,
      encoding: 'utf8',
    }),
  ) as { tasks: Task[] };
  const validation = graph.tasks.find(
    (task) => task.taskId === '@lasvegasfortransit/analytics#validate',
  );
  expect(validation?.dependencies).toContain('@lasvegasfortransit/analytics#test:e2e');
  expect(validation?.resolvedTaskDefinition.cache).toBe(false);
  const browser = graph.tasks.find(
    (task) => task.taskId === '@lasvegasfortransit/analytics#test:e2e',
  );
  expect(browser?.resolvedTaskDefinition.cache).toBe(false);
});

it('the real required graph includes uncached shared security checks at the existing CI threshold', () => {
  const graph = JSON.parse(
    execFileSync(
      'pnpm',
      ['exec', 'turbo', 'run', 'lint', 'check-types', 'test', 'validate', '--dry=json'],
      {
        cwd: root,
        encoding: 'utf8',
      },
    ),
  ) as { tasks: Task[] };
  for (const [name, command] of [
    ['security:secrets', 'lvbt check secrets'],
    ['security:dependencies', 'pnpm audit --audit-level=high'],
  ]) {
    const task = graph.tasks.find(({ taskId }) => taskId === `//#${name}`);
    expect(task?.command).toBe(command);
    expect(task?.resolvedTaskDefinition.cache).toBe(false);
    const validation = graph.tasks.find(
      ({ taskId }) => taskId === '@lasvegasfortransit/analytics#validate',
    );
    expect(validation?.dependencies).toContain(`//#${name}`);
  }
});

it('CI delegates security to the required check and retains full-history checkout', () => {
  const workflow = readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8');
  expect(workflow).toContain('fetch-depth: 0');
  expect(workflow).toContain('run: pnpm check');
  expect(workflow).not.toMatch(
    /run: pnpm audit|docker run|name: Secret scan|name: Dependency audit/,
  );
});
