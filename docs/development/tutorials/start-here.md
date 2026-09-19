# Set up a contributor checkout

This tutorial prepares a local checkout, runs the same validation as CI, and exercises the client
and collector tests. Node.js 24.20, git, and an authenticated GitHub CLI are required.

## Bootstrap the repository

```bash
git clone git@github.com:LasVegasForTransit/analytics.git
cd analytics
corepack enable
pnpm bootstrap
```

Bootstrap installs the pinned pnpm version, dependencies, repository hooks, and preflight checks. A
failing preflight item prints the command that repairs it.

## Run the complete check

```bash
pnpm check
```

The check formats and lints the repository, validates documentation and repository structure,
typechecks every workspace, runs browser-unit and real-workerd tests, builds the package, checks its
published exports, and performs a Wrangler dry run.

Use the focused commands while changing one boundary:

```bash
pnpm --filter @lvbt/analytics test
pnpm --filter @lvbt/analytics-collector test
pnpm --filter @lvbt/analytics-report test
```

`pnpm check:fix` applies formatting and safe lint fixes. Run `pnpm check` again after it finishes.

## Make a contribution

Choose a commit scope from `.lvbt/commit-scopes.txt`: `client`, `collector`, `report`, `docs`, `ci`,
or `dx`. A change that crosses boundaries omits the scope.

Create pull requests through the repository contribution helper described in `AGENTS.md`. The
required GitHub status is `Validate`, which runs the same `pnpm check` command used locally.

No Cloudflare credential is needed for ordinary development. Deployment and reporting commands use
maintainer-scoped credentials only during operational work.
