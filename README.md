# transcript-browser

Shared, framework-agnostic **transcript browser** for AI agent session
transcripts. The eventual goal is a single React viewer for agent transcripts,
consumed by two existing apps:

- `peasant/web`
- `village/frontend`

This is a pnpm workspace monorepo. As of this scaffold it contains the shared
TypeScript types and empty package shells; the viewer components have **not**
been extracted yet.

## Packages

| Package | Name | Status |
|---|---|---|
| `packages/types` | `@peasant-labs/types` | Shared transcript types (the reconciled superset). |
| `packages/theme` | `@peasant-labs/theme` | CSS variable tokens + Tailwind v4 preset placeholder. |
| `packages/browser` | `@peasant-labs/transcript-browser` | React 19 library scaffold — builds, exports nothing real yet. |
| `examples/minimal` | `@peasant-labs/example-minimal` | Tiny Vite app importing `@peasant-labs/types` to prove wiring. |

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
- See [`DIVERGENCES.md`](./DIVERGENCES.md) for the reconciliation details.
- Neither `peasant` nor `village` has been wired to consume these packages yet;
  that is a later task.
