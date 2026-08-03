# @peasant-labs/transcript-browser

React transcript graph infrastructure and browser-specific UI for AI agent
sessions. The canonical viewer composition is owned by
`@peasant-labs/fairtrade`: adapt a schema payload with `adaptTranscript`, render
it with `TranscriptViewer`, and optionally provide this package's
`TrajectoryGraph` through the viewer's graph slot.

`SessionDetail` remains exported for compatibility with prior integrations. It
is a deprecation candidate: existing consumers may continue to use it, but new
viewer work and new integrations should use Fairtrade's `TranscriptViewer`.

## Install

Fairtrade, React, React DOM, and `@xyflow/react` must be available when importing
the package's root entry point. Although `@xyflow/react` is marked as an optional
peer in package metadata, the root barrel statically exports `TrajectoryGraph`,
which statically imports React Flow. It is therefore required for root-entry
consumers. A future dedicated graph entry point could make that dependency
truly optional without changing the current API.

The package depends on `@peasant-labs/schema@0.1.0`; package managers install
that canonical wire contract automatically. Fairtrade is a required peer at
`>=0.0.10 <0.1.0`.

```bash
pnpm add @peasant-labs/transcript-browser @peasant-labs/fairtrade @xyflow/react react react-dom
```

Import Fairtrade's styles before transcript-browser's domain-only stylesheet.
The browser stylesheet contains `tb-` domain rules; it does not bundle
Fairtrade fonts, tokens, base styles, or components.

```ts
import "@peasant-labs/fairtrade/fonts.css";
import "@peasant-labs/fairtrade/tokens.css";
import "@peasant-labs/fairtrade/base.css";
import "@peasant-labs/fairtrade/components.css";
import "@peasant-labs/transcript-browser/styles.css";
import "@xyflow/react/dist/style.css";
```

## Canonical usage

```tsx
import { useMemo } from "react";
import {
  TrajectoryGraph,
  annotateTranscript,
  type SessionDetailPayload,
} from "@peasant-labs/transcript-browser";
import {
  TranscriptViewer,
  adaptTranscript,
  type ToolCallVM,
} from "@peasant-labs/fairtrade/ui";

function Viewer({ detail }: { detail: SessionDetailPayload }) {
  const vm = useMemo(() => adaptTranscript(detail), [detail]);
  const turns = detail.turns ?? [];
  const annotations = annotateTranscript(turns);
  const toolVMsByTurn = new Map<number, ToolCallVM[]>(
    vm.turns.map((turn) => [turn.index, turn.toolCalls]),
  );

  return (
    <TranscriptViewer
      viewModel={vm}
      capabilities={{
        canEdit: false,
        canLabel: false,
        canContribute: false,
        canChangeVisibility: false,
        canExport: true,
      }}
      graphSlot={() => (
        <TrajectoryGraph
          turns={turns}
          toolVMsByTurn={toolVMsByTurn}
          filteredTurns={turns}
          phases={[]}
          annotations={annotations}
          searchMatches={[]}
          provider={detail.harness}
        />
      )}
    />
  );
}
```

`capabilities` is required and should be derived from the host's authentication
and authorization state. See `examples/minimal/src/App.tsx` for the live
composition that CI typechecks.

Fairtrade owns the wire-to-view-model adapter, cooked view models, canonical
viewer composition, transcript tool rows and markers, provider brand marks, and
graph node visuals. Transcript-browser owns React Flow topology and interaction,
plus browser-specific envelopes and retained compatibility surfaces.

## Compatibility composer

`SessionDetail` is the prior-version all-in-one composer. It remains available
so existing consumers are not broken, but it is not the starting point for new
integrations. Its props-driven contract remains transport- and router-agnostic:
data enters through props and actions leave through callbacks and capability
flags.

`SessionDetailProps`, `ViewerCallbacks`, and `ViewerCapabilities` are the
contract of record for this retained surface; they are declared in
`packages/browser/src/SessionDetail.tsx` and `packages/browser/src/canvas/types.ts`.
When `turns` is omitted, `SessionDetail` applies the exported `prefilterTurns`
helper to `detail.turns`.

The retained composer includes an exported `ActionMenu`. Its copy-link item is
shown when `canCopyLink` and a link builder are present: `SessionDetail`'s
`sessionLinkBuilder`, which it forwards to `ActionMenu`'s `linkBuilder`.
`onCopyLink` is optional because the component also attempts to write the built
URL through the Clipboard API. Other actions require their capability and
callback, except download, which has a built-in serializer. The package also
exports `ShareDialog`; hosts still own app-specific routes, authentication,
queries, and the flows they connect to these generic surfaces.

The producing agent is `SessionDetailPayload.harness`, whose `Harness` contract
comes from the canonical `@peasant-labs/schema` package. Transcript-browser does
not define a separate harness enum.

For a bare compatibility list view:

```tsx
import { TranscriptCanvas } from "@peasant-labs/transcript-browser";

<TranscriptCanvas turns={detail.turns ?? []} provider={detail.harness} />;
```

## Public exports

The root barrel currently exports the following runtime surfaces and their
associated public types where declared:

- **Compatibility composition:** `SessionDetail`, `SessionTab`.
- **Canvas:** `TranscriptCanvas`, `TurnRow`, `TurnContent`, `ThinkingBlock`,
  `EmptyState`, `ViewModeToggle`; compact-label helpers `preview`, `basename`,
  and `langFromPath`.
- **Domain primitives:** `CodeBlock`, `Markdown`, `DiffView`, `ErrorPill`,
  `ToolIcon`, `RoleGlyph`, `OutcomeChip`, plus `langFromClassName` and
  `collectOutcomeReasons`.
- **Graph:** `TrajectoryGraph`, `GraphControls`, `GraphLegend`, `TurnCardNode`,
  `ToolPillNode`, `SubagentBranchNode`, `useCanvasSync`, `turnsToFlow`,
  `computeLaneHeaders`, `NODE_DIMENSIONS`, and `EDGE_DEFAULTS`.
- **Rails:** `RightRail`, `RailColumn`, `OutlineList`, `HighlightsOutline`,
  `DiffsOutline`, `FilesOutline`, `AnnotationsOutline`, `CheckpointSelector`,
  `HorizontalScrubber`, `FilterSection`, `FilterCheckbox`, `ViewOptions`,
  `FilterCategory`, `ToolGroup`, `TagFilter`, `toggleInSet`, `emptyFilterState`,
  `defaultViewOptions`, `applyFilter`, `computeCounts`, and `rollupFiles`.
- **Views:** `HighlightsView`, `DiffsView`, `diffAnchorId`, `FilesView`,
  `AnnotationsView`, and the `SessionScorecard` component.
- **Header:** `SessionHero`, `TabStrip`, `StickyHeader`, `TurnContextBar`,
  `MetadataChips`, `Breadcrumb`, `ActionMenu`, `renderDownload`, and
  `useTriggerOffscreen`.
- **Overlays:** `SearchBar`, `useSearchHotkey`, `ProgressIndicator`, and
  `ShareDialog`.
- **Pure helpers:** `computeTasks`, `computeTurnLabels`, `buildTaskWaterfall`,
  `phaseLabel`, `providerLabel`, `prefilterTurns`, `nextNavTurn`,
  `formatRelative`, `formatDurationMins`, `formatDateLong`, `formatDuration`,
  `formatTokens`, `composeSessionTitle`, `summarizePrompt`, `projectLabel`,
  `annotateTranscript`, `assessSession`, `computePersonalMedians`, `retryShare`,
  and `median`.
- **Schema and view types:** selected schema types (`SessionDetailPayload`,
  `TurnDetail`, `ToolCallDetail`, the `SessionScorecard` data type,
  `QualitySession`, `Harness`, `Role`), browser-owned view envelopes (`Phase`,
  `PhaseBadge`, `PhaseType`),
  Fairtrade `TranscriptInitialPosition`, `CommitVM`, and `SessionGitVM`, and the
  component/helper types exported alongside the surfaces above.

Generic UI primitives, `TranscriptViewer`, `adaptTranscript`, transcript tool
renderers and markers, and provider visuals are imported from
`@peasant-labs/fairtrade/ui`. There is no `primitives` namespace export from
transcript-browser. In particular, the root barrel does not export
`ToolCallRow`, `ToolCallList`, `PhaseDivider`, `CheckpointMarker`,
`TaskBoundary`, `rendererFor`, per-tool renderers, `ProviderIcon`, or
`parseArgs`.

## Package boundary

No component fetches data, opens a WebSocket, reads environment variables, or
imports host-app routing. Hosts remain responsible for transport, routing,
authentication, mutations, and app-specific dialogs. Canonical wire contracts
and runtime values come from `@peasant-labs/schema`; this package owns only
browser-specific presentation contracts.
