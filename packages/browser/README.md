# @peasant-labs/transcript-browser

A **framework-agnostic** React viewer for AI agent session transcripts. Ported
from the peasant `web` v2 viewer and reconciled against village, this package
renders a `SessionDetailPayload` — markdown, thinking blocks, tool-specific
renderers (Read / Edit / Write / Bash / Grep / Task / WebFetch), diffs, phase
dividers, git checkpoints, a trajectory graph, outline + filter rails, curated
views (Highlights / Diffs / Files / Annotations), a session header with an
agnostic action menu, and search / progress / share overlays — with **no app
coupling**.

The full viewer is the `<SessionDetail>` composer; `<TranscriptCanvas>` remains
available as the bare list view.

## Install

```bash
pnpm add @peasant-labs/transcript-browser @peasant-labs/theme @peasant-labs/types react react-dom
# Only if you mount the graph view — it's an OPTIONAL peer dependency:
pnpm add @xyflow/react
```

Import the two stylesheets once at your app root:

```ts
import "@peasant-labs/theme/tokens.css";              // the --tb-* token contract
import "@peasant-labs/transcript-browser/styles.css"; // the component CSS
// Only if you use the graph view:
import "@xyflow/react/dist/style.css";
```

## Usage — the `<SessionDetail>` composer

`SessionDetail` assembles the header (hero, sticky header, tab strip, turn-
context bar), the center content (canvas / graph / per-tab views) and the right
rail (outline + filters) from props and callbacks. It owns only *view* state
(active tab, trajectory mode, filters, search, scroll); **all data flows IN via
props**, all actions flow OUT via the callbacks/capabilities contract.

```tsx
import {
  SessionDetail,
  TrajectoryGraph,
  annotateTranscript,
} from "@peasant-labs/transcript-browser";
import type { SessionDetailPayload } from "@peasant-labs/types";

function Viewer({ detail }: { detail: SessionDetailPayload }) {
  // The host derives annotations + phases and passes them in — the package
  // never derives them implicitly.
  const annotations = annotateTranscript(detail.turns);

  return (
    <SessionDetail
      detail={detail}
      annotations={annotations}
      // phases={detectPhases(detail.turns)}   // host runs phase detection
      // scorecard={detail.scorecard}          // optional self-assessment card
      breadcrumb={[{ label: "Sessions", href: "/sessions" }, { label: detail.id.slice(0, 8) }]}
      // Optional capabilities + callbacks (omit → read-only):
      capabilities={{ canEdit: isOwner, canContribute: true, canCopyLink: true, canDownload: true }}
      callbacks={{ onEdit: openEditDialog, onContribute: openContributeFlow }}
      sessionLinkBuilder={(d) => `/sessions/${d.id}`}
      // Enable the Graph toggle by passing the render-prop (carries the peer dep):
      renderGraph={(props) => <TrajectoryGraph {...props} />}
      // Optional host-owned per-turn action slot (e.g. a label popover):
      // renderTurnActions={(turn) => <MyLabelButton entryIndex={turn.index} />}
      stickyTop={64}   // height of your app navbar, so the sticky header sits below it
    />
  );
}
```

For the bare list view alone:

```tsx
import { TranscriptCanvas } from "@peasant-labs/transcript-browser";

<TranscriptCanvas turns={detail.turns} provider={detail.provider} commits={detail.gitContext?.commits} />;
```

Wrap (or set on any ancestor) `class="tb-dark"` to flip the viewer to the dark
palette. No re-render or prop change required.

### The graph view (`@xyflow/react` peer dependency)

The trajectory graph is the one slice with an external rendering dependency, so
`@xyflow/react` is an **optional peer dependency**. The package never imports it
at the top level — `SessionDetail` takes a `renderGraph` render-prop, and the
host passes `(props) => <TrajectoryGraph {...props} />`. Omit `renderGraph` and
the trace shows only the list view (no peer dep needed).

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

The shared action surface (declared in `ViewerCallbacks` / `ViewerCapabilities`)
is consumed by the header `ActionMenu`, the `ShareDialog`, and the per-turn
slot:

```ts
interface ViewerCallbacks {
  onLabelSave?: (label: TurnLabel) => void | Promise<TurnLabel>;
  onEdit?: () => void;
  onVisibilityChange?: (visible: boolean) => void;
  onContribute?: () => void;               // share / publish / contribute
  onCopyLink?: (url: string) => void;      // url built by linkBuilder
  onDownload?: (format: DownloadFormat) => void; // override built-in serializer
  onChatWithTrace?: () => void;
}

interface ViewerCapabilities {
  canLabel?: boolean;
  canEdit?: boolean;
  canChangeVisibility?: boolean;
  canContribute?: boolean;
  canCopyLink?: boolean;
  canDownload?: boolean;          // works with the built-in JSON/JSONL/MD serializer
  canChatWithTrace?: boolean;
}
```

A capability flag is **necessary but not sufficient**: the matching callback (or
`renderTurnActions` slot, or — for download — the built-in serializer) must also
be available for an affordance to appear. **Manual labelling and the scorecard
are OPTIONAL** — components render fine when those props are absent.

#### How the `ActionMenu` reconciles peasant vs village

The two apps' menus diverge; the shared `ActionMenu` exposes the union as
capability-gated callbacks rather than hardcoding either:

| App affordance | peasant | village | Shared mapping |
|---|---|---|---|
| Primary share button | deep-links to a share *wizard* | opens a collective picker | `canContribute` + `onContribute` (host owns the flow); button label via `shareLabel`/`contributeLabel` |
| Copy link | — | `/transcripts/{id}` to clipboard | `canCopyLink` + `linkBuilder` (route shape) + `onCopyLink` |
| Edit | — | owner-gated dialog | `canEdit` + `onEdit` — **owner-gating is the host's job**: it sets `canEdit` only when the viewer owns the session (the package never reads auth) |
| Download | JSON/JSONL/MD via inline serializer | same | `canDownload` uses the built-in serializer; override via `onDownload` |
| Chat with trace | callback | callback | `canChatWithTrace` + `onChatWithTrace` |

No village/peasant-specific strings, routes, auth, queries or dialogs live in the
package — the host wires each affordance and owns its own modals.

### 3. Theming via CSS variables only

The viewer paints **exclusively** from `--tb-*` custom properties — no hardcoded
colours, fonts, brand strings or routes. Override any variable to re-theme the
whole viewer; the required token contract lives in `@peasant-labs/theme`
(`tokens.css`). Key tokens: `--tb-canvas`, `--tb-surface`, `--tb-ink[-2/-3/-4]`,
`--tb-rule[-strong]`, `--tb-rail`, `--tb-accent`, `--tb-positive/caution/negative`
(+ `-soft`), `--tb-diff-*`, `--tb-role-user/assistant` (+ `-soft`),
`--tb-provider-*`, `--tb-font-sans/mono`.

## Exports

- **Composer:** `SessionDetail` (the full viewer), `SessionTab`.
- **Canvas:** `TranscriptCanvas` (list view), `ViewModeToggle`, `TurnRow`,
  `TurnContent`, `ToolCallRow`, `ToolCallList`, `ThinkingBlock`, `PhaseDivider`,
  `CheckpointMarker`, `TaskBoundary`, `EmptyState`, `rendererFor` + the eight
  tool renderers.
- **Graph:** `TrajectoryGraph`, `GraphControls`, `GraphLegend`, the node
  components, `useCanvasSync`, `turnsToFlow`, `computeLaneHeaders`,
  `NODE_DIMENSIONS`, `EDGE_DEFAULTS`. *(Requires the `@xyflow/react` peer dep.)*
- **Rails:** `RightRail`, `OutlineList`, `HighlightsOutline`, `DiffsOutline`,
  `FilesOutline`, `AnnotationsOutline`, `CheckpointSelector`,
  `HorizontalScrubber`, `FilterSection`, `FilterCheckbox`, `ViewOptions`, plus
  the filter state helpers (`applyFilter`, `computeCounts`, `emptyFilterState`,
  `defaultViewOptions`, `FilterCategory`, `ToolGroup`, `TagFilter`,
  `rollupFiles`).
- **Views:** `HighlightsView`, `DiffsView` (+ `diffAnchorId`), `FilesView`,
  `AnnotationsView`, `SessionScorecard` (optional).
- **Header:** `SessionHero`, `TabStrip`, `StickyHeader`, `TurnContextBar`,
  `MetadataChips`, `Breadcrumb`, `ActionMenu` (+ `renderDownload`),
  `useTriggerOffscreen`.
- **Overlays:** `SearchBar` (+ `useSearchHotkey`), `ProgressIndicator`,
  `ShareDialog`.
- **Primitives:** `CodeBlock`, `Markdown`, `DiffView`, `TokenBadge`,
  `DurationBadge`, `OutcomeChip`, `ErrorPill`, `RoleGlyph`, `Chip`, `ToolIcon`,
  `ProviderIcon`, `Kbd`.
- **Helpers (pure):** `computeTasks`, `computeTurnLabels`, `phaseLabel`,
  `providerLabel`, `formatRelative`, `formatTokens`, `formatDuration`,
  `parseArgs`, `composeSessionTitle`, `summarizePrompt`, `projectLabel`,
  `annotateTranscript`, `assessSession`, `computePersonalMedians`.
- **Types:** the contract types (`TurnLabel`, `TurnLinkBuilder`,
  `ViewerCallbacks`, `ViewerCapabilities`, `RenderTurnActions`,
  `DownloadFormat`, `TranscriptAnnotation`) plus the shared transcript shapes
  re-exported from `@peasant-labs/types`.

## Dependencies

Runtime deps are kept lean and framework-neutral: `lucide-react` (icons),
`shiki` (syntax highlighting), `react-markdown` + `remark-gfm` (markdown),
`diff` (inline diffs), `clsx` (class joining). `@xyflow/react` is an **optional
peer dependency** — needed only for the graph view. No UI kit, no router, no
data layer. (Radix tooltips/popovers/dialogs from the source apps were replaced
with a dependency-free CSS tooltip, self-contained dropdown menus, and a
host-owned action slot.)
