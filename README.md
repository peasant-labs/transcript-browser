# transcript-browser

Shared, framework-agnostic **transcript browser** building blocks for AI agent
session transcripts, consumed by two existing apps:

- `peasant/web`
- `village/frontend`

This is a pnpm workspace monorepo. The canonical viewer pipeline is a wire
`SessionDetailPayload` passed through Fairtrade's `adaptTranscript`, then
rendered by Fairtrade's `TranscriptViewer`. This package supplies the React Flow
graph engine and browser-specific presentation envelopes. It also retains its
older `SessionDetail` composer as a compatibility API and deprecation candidate.

## Packages

| Package | Name | Status |
|---|---|---|
| `packages/types` | deprecated compatibility package | Pure re-export of the generated `@peasant-labs/schema` contract. |
| `packages/browser` | `@peasant-labs/transcript-browser` | Transcript graph engine, browser-specific components, and compatibility viewer. See its [README](./packages/browser/README.md). |
| `examples/minimal` | `@peasant-labs/example-minimal` | Vite app rendering Fairtrade's `<TranscriptViewer>` against a realistic sample. |

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
│   ├── types/      deprecated schema re-export
│   └── browser/    @peasant-labs/transcript-browser
├── examples/
│   └── minimal/    minimal Vite wiring proof
├── scripts/         repository validation and visual tooling
├── stories/         Storybook stories
├── .storybook/      Storybook configuration
├── flake.nix        Nix development environment
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```

## Notes

- Canonical wire types and runtime values come from the generated
  `@peasant-labs/schema` package. The browser owns only viewer-specific
  presentation envelopes.
- The viewer follows a strict **package boundary**: data in via props only,
  actions out via optional callbacks + capability flags, theming via fairtrade
  CSS variables only. See the [browser README](./packages/browser/README.md).
- See [`DIVERGENCES.md`](./DIVERGENCES.md) for the migration boundary.
- Host applications remain responsible for transport, routing, authentication,
  and mutations; the package only renders data supplied through props.

## npm publication

The release process: squash the release branch to one `release(vX.Y.Z): <summary>` commit
(bumping `packages/browser/package.json` to the same version), `merge --no-ff` into `main`,
tag the merge `transcript-browser-vX.Y.Z` (lightweight), push `main` + the tag. **Pushing
the tag publishes**: `.github/workflows/npm-publish.yml` runs the full `pnpm check` gate
chain, re-packs via `prepack` (tsup), and publishes
`@peasant-labs/transcript-browser` via **npm Trusted Publishing (OIDC)** - no `NPM_TOKEN`
secret exists. `pnpm test:package-provenance` keeps the publishable package's canonical
repository and monorepo directory metadata exact. npm generates provenance automatically
only when this source repository is public; private source repositories remain unattested
even though OIDC authentication succeeds. A prerelease version (`-rcN` etc.) lands under
dist-tag `next`; a final under `latest`. The workflow refuses a tag whose version does not
match the package manifest, reports the expected missing attestation while this repository
is private, and hard-fails after publication if a public-source release lacks the SLSA
provenance predicate.

One-time maintainer registrations (state lives on GitHub/npmjs.com, not in-repo): (1) a
`npm-publish` GitHub Actions **environment** on this repo; (2) on npmjs.com, this repo +
`npm-publish.yml` + that environment registered as the package's **Trusted Publisher**.
Never add a token secret as a fallback; if OIDC exchange fails, fix the registration.
