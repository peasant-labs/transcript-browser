# Visual capture harness — transcript-browser minimal example

Capture the **real assembled transcript-browser app** (the `examples/minimal` Vite host) across every
transcript surface + both themes, and pair each shot against the canonical **fairtrade demo** so a human
can eyeball the lifted-composite migration. The TB host wires a session payload through the lifted
fairtrade composite:

```
wire SessionDetailPayload → adaptTranscript() → <TranscriptViewer>   (+ TB's @xyflow TrajectoryGraph in graphSlot)
```

These scripts produce **capture artifacts only** — they do not assert pixel/data parity. Parity is a
human judgement made from the side-by-side composites.

> Intended home: `transcript-browser/scripts/visual/`. The scripts hardcode **no** absolute or
> worktree-specific paths; everything host-specific is an env var or CLI arg (see below).

## Scripts

| Script | Role |
|---|---|
| `probe-tb.mjs` | Print the example's DOM shape — tab/view-toggle labels, `.txn-*` box sizes, and `.txn-stream` scroll metrics. Run first whenever the example markup changes, to confirm the capture selectors still resolve and the stream overflows internally (`scrollHeight > clientHeight`). |
| `tb-shoot.mjs` | Drive the example with puppeteer and screenshot every surface for one theme. Mirrors the surface set + nav of fairtrade's `scripts/shootdemo.mjs` so the shots pair 1:1. Each surface is wrapped in try/catch: one failure records a gap and the run continues. |
| `stitch-sxs.mjs` | Compose labeled, **height-matched** side-by-side composites (`DEMO | TB-APP`) per surface per theme from `demo/` + `tb/`. The shorter pane is padded (never scaled) with its own border-sampled background; a dashed hairline marks where the shorter capture ends. A surface missing a TB capture gets a labeled placeholder panel so the set stays complete. |

The **demo side** is captured separately by fairtrade's own harness (`fairtrade-design-system/scripts/shootdemo.mjs`)
and written into `<base>/demo/<theme>/`; this harness consumes those PNGs but does not produce them.

## Environment

| Var | Used by | Default | Notes |
|---|---|---|---|
| `CHROME_PATH` | all | — (**required**) | Path to a Chrome/Chromium binary puppeteer drives. |
| `TB_URL` | probe, shoot | `http://localhost:5173/` | The minimal example's dev-server URL (Vite's default port). |
| `PUPPETEER_CORE` | all | `puppeteer-core` | Explicit module path to `puppeteer-core`, **only** if a bare import won't resolve (see below). |

**`puppeteer-core` resolution.** These scripts `import('puppeteer-core')`, which is a **devDependency of this
repo** — so `pnpm install` makes the bare import resolve and `pnpm probe:tb` / `pnpm shoot:tb` / `pnpm sxs`
run out of the box (you still supply `CHROME_PATH`). `PUPPETEER_CORE` is only needed to point at an explicit
copy (e.g. `PUPPETEER_CORE=/path/to/fairtrade/node_modules/puppeteer-core`) when running a script from a
context where that bare import can't resolve.

## Host assumptions

- The example mounts the viewer in a **height-bounded** host (a `100vh` flex column; the lifted `.txn-app`
  is `height:100%`), so `.txn-stream` scrolls **internally** — this is what reveals the sticky scrubber and
  lets `shotTall()` capture the full trace stream. An auto-height host would scroll the window instead and
  neither would appear.
- Theme is toggled via the host's `.theme-btn` (sets `[data-theme]` + the `theme` prop), not a URL param.
- `prefers-reduced-motion: reduce` is emulated so animated surfaces capture at rest.

## Run

```sh
CHROME=/path/to/google-chrome
BASE=/abs/path/to/uat-shots          # holds demo/, tb/, sxs/

# 0. (optional) probe the DOM after any example markup change
CHROME_PATH=$CHROME TB_URL=http://localhost:5173/ node probe-tb.mjs

# 1. demo side — fairtrade's harness (run from the fairtrade repo; serves :5180 via `pnpm dev`)
CHROME_PATH=$CHROME DEMO_PORT=5180 node scripts/shootdemo.mjs dark  $BASE/demo/dark
CHROME_PATH=$CHROME DEMO_PORT=5180 node scripts/shootdemo.mjs light $BASE/demo/light

# 2. TB side — start the example dev server, then shoot both themes
#    (from the TB repo root: `pnpm dev:minimal`; clear examples/minimal/node_modules/.vite first if the
#     fairtrade lib was rebuilt, so Vite re-serves the fresh ESM)
CHROME_PATH=$CHROME TB_URL=http://localhost:5173/ node tb-shoot.mjs dark  $BASE/tb/dark
CHROME_PATH=$CHROME TB_URL=http://localhost:5173/ node tb-shoot.mjs light $BASE/tb/light

# 3. side-by-side composites
CHROME_PATH=$CHROME node stitch-sxs.mjs $BASE
```

## Gap handling

`tb-shoot.mjs` never aborts the whole run on a single bad surface: each surface is wrapped so a failure is
recorded as a gap (with an actionable reason) and the run continues, maximising artifacts + an honest gap
list. The final line prints `captured: N gaps: M` and a `RESULTS_JSON=…` summary. `stitch-sxs.mjs` draws a
labeled placeholder for any surface that has a demo capture but no TB capture, so a gap is visible in the
side-by-side set rather than silently dropped.
