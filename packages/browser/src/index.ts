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
 * The primary entry point is `<SessionDetail detail={…} … />` — the full viewer
 * (header + tabs + canvas/graph/rails/views). `<TranscriptCanvas>` remains
 * available as the bare list view.
 */

// --- Top-level composer ----------------------------------------------------
export { SessionDetail, type SessionDetailProps } from "./SessionDetail.js";
export { SessionTab, type SessionTabDef } from "./session-detail-types.js";

// --- Slices ----------------------------------------------------------------
export * from "./primitives/index.js";
export * from "./canvas/index.js";

// Generic UI comes directly from @peasant-labs/fairtrade — import generics from
// `@peasant-labs/fairtrade/ui`, not from this package. The old `primitives`
// compat namespace was a second import path that re-exported the whole fairtrade
// catalog (the duplication this adoption removes), so it was dropped;
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

// --- Shared transcript types (single import path for consumers) ------------
export type {
  SessionDetailPayload,
  TurnDetail,
  ToolCallDetail,
  SessionCommit,
  SessionGitContext,
  SessionScorecard,
  QualitySession,
  Provider,
  Role,
  Phase,
  PhaseType,
} from "@peasant-labs/types";
