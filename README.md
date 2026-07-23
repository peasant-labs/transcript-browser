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
| `packages/types` | `@peasant-labs/types` | Shared transcript + analytics types (the reconciled superset). |
| `packages/browser` | `@peasant-labs/transcript-browser` | Framework-agnostic React viewer — primitives + transcript canvas. See its [README](./packages/browser/README.md). |
| `examples/minimal` | `@peasant-labs/example-minimal` | Vite app rendering `<TranscriptCanvas>` and `<ProjectOverview>` against realistic samples. |

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
│   ├── browser/    @peasant-labs/transcript-browser
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
  actions out via optional callbacks + capability flags, theming via fairtrade
  CSS variables only. See the [browser README](./packages/browser/README.md).
- See [`DIVERGENCES.md`](./DIVERGENCES.md) for the type reconciliation details.
- Neither `peasant` nor `village` has been wired to consume these packages yet;
  that is a later task.

## npm publication

The release ceremony: squash the epoch branch to one `release(vX.Y.Z): <summary>` commit
(bumping `packages/browser/package.json` to the same version), `merge --no-ff` into `main`,
tag the merge `transcript-browser-vX.Y.Z` (lightweight), push `main` + the tag. **Pushing
the tag publishes**: `.github/workflows/npm-publish.yml` runs the full `pnpm check` gate
chain, re-packs via `prepack` (tsup + the `workspace:*` devDependency strip), and publishes
`@peasant-labs/transcript-browser` via **npm Trusted Publishing (OIDC)** — no `NPM_TOKEN`
secret exists, provenance attestation is automatic. A prerelease version (`-rcN` etc.)
lands under dist-tag `next`; a final under `latest`. The workflow refuses a tag whose
version does not match the package manifest.

One-time maintainer registrations (state lives on GitHub/npmjs.com, not in-repo): (1) a
`npm-publish` GitHub Actions **environment** on this repo; (2) on npmjs.com, this repo +
`npm-publish.yml` + that environment registered as the package's **Trusted Publisher**.
Never add a token secret as a fallback; if OIDC exchange fails, fix the registration.
