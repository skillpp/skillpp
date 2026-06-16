# Skill++ Compatibility Contract

Skill++ treats routing, schemas, checkpoints, and CLI commands as a public protocol. New skills can be added, but existing v0.1 behavior must remain available unless the package opens a new compatibility baseline.

## Public Contract

The following surfaces are stable within the v0.1 line:

- npm package name: `skillpp`
- CLI command: `skillpp`
- AI entry point: `SKILL.md`
- machine registry: `skillpp.manifest.json`
- schema files: `handoff`, `token`, `audit`, and `checkpoint`
- pipeline IDs beginning with `P_`
- checkpoint IDs and blocking semantics
- command routes for `analyze`, `scan`, `trade`, `audit`, `wallet`, `signals`, and `create`
- default private-path redaction in `skillpp doctor`

## Update Rules

Use additive changes for v0.1:

- Add a new skill without renaming or removing existing skill names.
- Add a new pipeline without changing existing pipeline IDs.
- Add fields to schemas without removing required fields.
- Add optional commands without changing existing command meanings.
- Add richer adapters and prompts while keeping `SKILL.md` as the primary AI entry.

Treat these as breaking changes:

- Removing or renaming an existing skill, pipeline ID, checkpoint ID, schema file, or CLI command.
- Reordering a pipeline in a way that changes the required v0.1 sequence.
- Changing a blocking checkpoint into a non-blocking checkpoint.
- Exposing absolute local paths in default `skillpp doctor` output.
- Making write operations run without explicit checkpoint confirmation.

Breaking changes require a new compatibility baseline. After Skill++ reaches `1.0.0`, breaking protocol changes also require a new major package version.

## Compatibility Tests

The v0.1 baseline is stored in `tests/compatibility/v0.1.0.json`.

Run:

```bash
npm run compatibility
```

The check verifies that:

- all required v0.1 skills still exist
- all required v0.1 pipeline IDs still exist
- existing pipeline sequences remain in order
- blocking checkpoint behavior remains blocking
- CLI commands still route to the same pipeline IDs
- package metadata still exposes the same npm command and core files

The baseline is intentionally separate from implementation details. It allows Skill++ to keep growing while protecting the protocol users already rely on.
