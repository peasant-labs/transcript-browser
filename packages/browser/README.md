# @peasant-labs/transcript-browser

A **framework-agnostic** React viewer for AI agent session transcripts. Ported
from the peasant `web` v2 viewer and reconciled against village, this package
renders a `SessionDetailPayload`'s turns — markdown, thinking blocks,
tool-specific renderers (Read / Edit / Write / Bash / Grep / Task / WebFetch),
diffs, phase dividers and git checkpoints — with **no app coupling**.

> This is the first extraction slice: **primitives + the canvas (list) view**.
> Graph / rails / header / overlays are deferred to later slices.

## Install

```bash
pnpm add @peasant-labs/transcript-browser @peasant-labs/theme @peasant-labs/types react react-dom
```

Import the two stylesheets once at your app root:

```ts
import "@peasant-labs/theme/tokens.css";              // the --tb-* token contract
import "@peasant-labs/transcript-browser/styles.css"; // the component CSS
```

## Usage

```tsx
import { TranscriptCanvas } from "@peasant-labs/transcript-browser";
import type { SessionDetailPayload } from "@peasant-labs/types";

function Viewer({ detail }: { detail: SessionDetailPayload }) {
  return (
    <TranscriptCanvas
      turns={detail.turns}
      provider={detail.provider}
      commits={detail.gitContext?.commits}
      // phases={...} optional sticky section dividers
      // ...all other props optional → fully read-only
    />
  );
}
```

Wrap (or set on any ancestor) `class="tb-dark"` to flip the viewer to the dark
palette. No re-render or prop change required.

## The agnosticism contract

This is the whole point of the package. Three rules, enforced by the API shape:

### 1. Data IN via props only

No component fetches, opens a WebSocket, reads env vars, or imports app code.
The top-level `TranscriptCanvas` takes `turns: TurnDetail[]` (plus optional
`phases`, `commits`, `provider`, search/view options) as props. You bring the
data however you like (REST, WS, static JSON); the viewer just renders it.

### 2. Actions OUT via callbacks + capability flags

Even though this slice ships no action menu, the prop types are designed so
future slices (and host apps **today**) can hook in mutations **without
forking**. Everything below is **optional** — omit them all and the viewer is
read-only:

| Prop | Type | Purpose |
|---|---|---|
| `linkBuilder` | `(turn) => string` | Build per-turn anchor hrefs. Defaults to `#turn-{index}` — no hardcoded app routes. |
| `renderTurnActions` | `(turn) => ReactNode` | Host-owned action slot in each turn header (e.g. a manual-label popover). The viewer ships **no** labelling UI of its own — your app mounts its own annotation control here, keeping its API out of the package. |
| `savedLabelsByEntry` | `Map<number, TurnLabel[]>` | Render existing labels as chips on the matching turns. |

The shared action surface (declared in `ViewerCallbacks` / `ViewerCapabilities`,
exported for host typing now, wired into the header slice later):

```ts
interface ViewerCallbacks {
  onLabelSave?: (label: TurnLabel) => void | Promise<TurnLabel>;
  onEdit?: () => void;
  onVisibilityChange?: (visible: boolean) => void;
  onContribute?: () => void;
}

interface ViewerCapabilities {
  canLabel?: boolean;
  canEdit?: boolean;
  canChangeVisibility?: boolean;
  canContribute?: boolean;
}
```

A capability flag is **necessary but not sufficient**: the matching callback (or
`renderTurnActions` slot) must also be supplied for an affordance to appear.
**Manual labelling and any scorecard are OPTIONAL** — components render fine when
those props are absent.

### 3. Theming via CSS variables only

The viewer paints **exclusively** from `--tb-*` custom properties — no hardcoded
colours, fonts, brand strings or routes. Override any variable to re-theme the
whole viewer; the required token contract lives in `@peasant-labs/theme`
(`tokens.css`). Key tokens: `--tb-canvas`, `--tb-surface`, `--tb-ink[-2/-3/-4]`,
`--tb-rule[-strong]`, `--tb-rail`, `--tb-accent`, `--tb-positive/caution/negative`
(+ `-soft`), `--tb-diff-*`, `--tb-role-user/assistant` (+ `-soft`),
`--tb-provider-*`, `--tb-font-sans/mono`.

## Exports

- **Top-level:** `TranscriptCanvas` (the list view).
- **Canvas pieces:** `TurnRow`, `TurnContent`, `ToolCallRow`, `ToolCallList`,
  `ThinkingBlock`, `PhaseDivider`, `CheckpointMarker`, `TaskBoundary`,
  `EmptyState`, `rendererFor` + the eight tool renderers.
- **Primitives:** `CodeBlock`, `Markdown`, `DiffView`, `TokenBadge`,
  `DurationBadge`, `OutcomeChip`, `ErrorPill`, `RoleGlyph`, `Chip`, `ToolIcon`,
  `ProviderIcon`, `Kbd`.
- **Helpers:** `computeTasks`, `computeTurnLabels`, `phaseLabel`,
  `formatRelative`, `formatTokens`, `formatDuration`, `parseArgs`.
- **Types:** the contract types (`TurnLabel`, `TurnLinkBuilder`,
  `ViewerCallbacks`, `ViewerCapabilities`, `RenderTurnActions`) plus the shared
  transcript shapes re-exported from `@peasant-labs/types`.

## Dependencies

Runtime deps are kept lean and framework-neutral: `lucide-react` (icons),
`shiki` (syntax highlighting), `react-markdown` + `remark-gfm` (markdown),
`diff` (inline diffs), `clsx` (class joining). No UI kit, no router, no data
layer. (Radix tooltips/popovers from the source app were replaced with a
dependency-free CSS tooltip and a host-owned action slot.)
