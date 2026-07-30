# Contributing

Thank you for helping improve transcript-browser. For substantial changes,
open an issue first so the intended behavior and package boundaries can be
agreed before implementation.

## Prerequisites

- Node.js 24, matching the development shell and continuous-integration build
- pnpm 10.33.2, as pinned by the root `packageManager` field

## Setup

```sh
pnpm install --frozen-lockfile
```

## Repository layout

- `packages/browser` contains the published React viewer,
  `@peasant-labs/transcript-browser`.
- `packages/types` is a deprecated compatibility re-export of the generated
  `@peasant-labs/schema` package. Do not add new wire definitions there.
- `examples/minimal` is the integration playground for mounting the viewer.

Fairtrade (`@peasant-labs/fairtrade`) owns `adaptTranscript`, cooked view
models, and graph node visuals. This repository owns the `@xyflow` graph-engine
topology and interaction. Do not copy or fork Fairtrade's canonical visuals
here. `@peasant-labs/fairtrade` is a required peer dependency of the published
viewer.

## Development checks

Run the focused checks while developing:

```sh
pnpm build
pnpm typecheck
pnpm test
pnpm gates
```

Before requesting review, run the complete check when your environment supports
it:

```sh
pnpm check
```

`pnpm check` is the heavy gate. In addition to build, type checking, tests, and
package gates, it builds Storybook and runs smoke and visual-fidelity checks.
Those browser checks require Playwright Chromium to be installed.

## Changes and pull requests

- Keep changes focused and add or update tests for behavior changes.
- Use the existing conventional-commit style, such as `feat(browser): ...`,
  `fix(browser): ...`, `docs: ...`, or `ci: ...`.
- Explain user-visible effects, compatibility considerations, and the checks
  you ran in the pull request.
- Do not commit generated build output unless the repository already tracks it.

By contributing, you agree that your contributions are licensed under the
repository's Apache License 2.0.
