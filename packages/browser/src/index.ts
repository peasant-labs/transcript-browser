/**
 * @peasant-labs/transcript-browser
 *
 * Framework-agnostic React viewer for AI agent session transcripts.
 *
 * Data flows IN via props only — no fetching, WebSocket, env access or app
 * routing inside any component. Actions flow OUT via optional callbacks gated by
 * capability flags; the viewer renders fully read-only when none are supplied.
 * Theming is driven entirely by the fairtrade CSS variables from
 * `@peasant-labs/fairtrade`. See README.md for the full contract.
 *
 * Required styles (import ONCE at your app root, fairtrade CSS first then this
 * package's DOMAIN-only sheet):
 *   import "@peasant-labs/fairtrade/fonts.css";
 *   import "@peasant-labs/fairtrade/tokens.css";
 *   import "@peasant-labs/fairtrade/base.css";
 *   import "@peasant-labs/fairtrade/components.css";
 *   import "@peasant-labs/transcript-browser/styles.css";
 *
 * The canonical viewer pipeline adapts schema payloads with Fairtrade's
 * `adaptTranscript` and renders Fairtrade's `TranscriptViewer`, optionally with
 * this package's graph engine. `<SessionDetail>` remains available as a
 * compatibility composer, and `<TranscriptCanvas>` remains the bare list view.
 */

// --- Top-level composer ----------------------------------------------------
export { SessionDetail, type SessionDetailProps } from "./SessionDetail.js";
export type { TranscriptInitialPosition } from "@peasant-labs/fairtrade/ui";
export { SessionTab, type SessionTabDef } from "./session-detail-types.js";

// --- Slices ----------------------------------------------------------------
export * from "./primitives/index.js";
export * from "./canvas/index.js";

// Generic UI comes directly from @peasant-labs/fairtrade — import generics from
// `@peasant-labs/fairtrade/ui`, not from this package. The old `primitives`
// compat namespace re-exported the whole fairtrade catalog through a second
// import path, so it was dropped;
// transcript-browser exports only its DOMAIN surface (./primitives + the
// views/rails/etc. below).
export * from "./graph/index.js";
export * from "./rails/index.js";
export * from "./views/index.js";
export * from "./header/index.js";
export * from "./overlays/index.js";

// --- Pure helpers re-exported for hosts that want to share the viewer's logic
export { computeTasks, computeTurnLabels, type TaskGroup } from "./lib/tasks.js";
export { buildTaskWaterfall, type WaterfallSegment } from "./lib/waterfall.js";
export { phaseLabel } from "./lib/phase.js";
export { providerLabel } from "./lib/provider.js";
export { prefilterTurns } from "./lib/turn-filter.js";
export { nextNavTurn } from "./lib/turnNav.js";
export { formatRelative, formatDurationMins, formatDateLong } from "./lib/time.js";
export { formatDuration, formatTokens } from "./lib/format-numbers.js";
export {
  composeSessionTitle,
  summarizePrompt,
  projectLabel,
} from "./lib/title.js";
export {
  annotateTranscript,
  type TranscriptAnnotation,
} from "./lib/pattern-detection.js";
export {
  assessSession,
  computePersonalMedians,
  retryShare,
  median,
  type AxisVerdict,
  type AxisId,
  type AxisFlag,
  type AxisComparison,
  type Band,
  type PersonalMedians,
} from "./lib/scorecard.js";

// --- Canonical schema wire types -------------------------------------------
export type {
  SessionDetailPayload,
  TurnDetail,
  ToolCallDetail,
  SessionScorecard,
  QualitySession,
  Harness,
  Role,
} from "@peasant-labs/schema";

// --- Browser-owned view envelopes -----------------------------------------
export type { Phase, PhaseBadge, PhaseType } from "./view-types.js";
export type { CommitVM, SessionGitVM } from "@peasant-labs/fairtrade/ui";
