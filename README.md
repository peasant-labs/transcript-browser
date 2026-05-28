# transcript-browser

Shared, framework-agnostic **transcript browser** for AI agent session
transcripts. The eventual goal is a single React viewer for agent transcripts,
consumed by two existing apps:

- `peasant/web`
- `village/frontend`

This is a pnpm workspace monorepo. The first viewer slice — **primitives + the
canvas (list) view** — has been ported out of the peasant app into
`@peasant-labs/transcript-browser` as agnostic, props-driven components. The
graph / rails / header / overlay views are deferred to later slices.

## Packages

| Package | Name | Status |
|---|---|---|
| `packages/types` | `@peasant-labs/types` | Shared transcript types (the reconciled superset). |
| `packages/theme` | `@peasant-labs/theme` | `--tb-*` CSS variable token contract (light + dark). |
| `packages/browser` | `@peasant-labs/transcript-browser` | Framework-agnostic React viewer — primitives + transcript canvas. See its [README](./packages/browser/README.md). |
| `examples/minimal` | `@peasant-labs/example-minimal` | Vite app rendering `<TranscriptCanvas>` against a realistic sample session. |

## Quick start

```bash
pnpm install
pnpm -r build        # build every package
pnpm -r typecheck    # type-check every package
pnpm dev:minimal     # run the minimal example (Vite dev server)
```

## Layout

```
transcript-browser/
├── packages/
│   ├── types/      @peasant-labs/types
│   ├── theme/      @peasant-labs/theme
│   └── browser/    @peasant-labs/transcript-browser  (empty scaffold)
├── examples/
│   └── minimal/    minimal Vite wiring proof
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```

## Notes

- The shared types in `@peasant-labs/types` were lifted from `peasant/web`
  (the superset) and reconciled against `village/frontend`. App- and
  transport-specific types (WebSocket subscription machinery, REST list
  wrappers, list/dashboard payloads, redaction-review types) were deliberately
  left in their respective apps.
- The viewer follows a strict **agnosticism contract**: data in via props only,
  actions out via optional callbacks + capability flags, theming via `--tb-*`
  CSS variables only. See the [browser README](./packages/browser/README.md).
- See [`DIVERGENCES.md`](./DIVERGENCES.md) for the type reconciliation details.
- Neither `peasant` nor `village` has been wired to consume these packages yet;
  that is a later task.
