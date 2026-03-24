# Contributing

## Prerequisites

- Bun `>=1.3`
- Nuxt `4.x` project knowledge
- FormForge backend available for end-to-end/manual checks

## Local setup

```bash
bun install
```

## Development workflow

1. Create a branch from `main`.
2. Keep changes focused and deterministic.
3. Add or update tests when behavior changes.
4. Run quality checks before opening a PR.

## Required checks

```bash
bun run lint
bun run typecheck
bun run test
bun run build
```

## Coding guidelines

- Follow existing architecture and naming conventions.
- Keep TypeScript strict and avoid `any`.
- Prefer composable, testable units.
- Avoid new dependencies unless clearly justified.
- Preserve SSR compatibility and tree-shakeable exports.

## Pull requests

Please include:

- A short summary of the change
- Why the change is needed
- Test coverage details (new or updated tests)
- Any breaking changes or migration notes

## Branch and commit style

- Branches: `feat/*`, `fix/*`, `chore/*`, `docs/*`
- Commits: use conventional commit style when possible (example: `feat(runtime): add staged upload helper`)

Thank you for contributing.
