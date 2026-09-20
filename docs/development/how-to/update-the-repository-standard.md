# Update the repository standard

Analytics commits the LVBT web standard under `.lvbt/web-platform/`. The adjacent
`.lvbt/web-platform.json` records the release tag, source commit, content hash, and executable
files, so a checkout can validate its tooling without network or registry access.

## Review an update

Choose a tagged `LasVegasForTransit/repository-tooling` release and preview its exact vendor
changes:

```sh
pnpm standards:update --release <tag> --dry-run --json
```

Read the release notes and inspect every addition, change, and removal. The command rejects moving
branch names, local edits inside the vendor tree, invalid paths, and tags that do not resolve to one
commit.

## Apply and verify

```sh
pnpm standards:update --release <tag> --apply
pnpm install
pnpm check
```

Update the contribution-plugin ref in `.claude/settings.json` to the same tag. Commit the vendor
tree, metadata record, package manifests, and lockfile together. `pnpm standards:check` rejects a
partial update or any unrecorded change to the vendored files.
