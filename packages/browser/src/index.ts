/**
 * @peasant-labs/transcript-browser
 *
 * Framework-agnostic React viewer for AI agent session transcripts.
 *
 * Data flows IN via props only — no fetching, WebSocket, env access or app
 * routing inside any component. Actions flow OUT via optional callbacks gated by
 * capability flags; the viewer renders fully read-only when none are supplied.
 * Theming is driven entirely by the `--tb-*` CSS variables in
 * `@peasant-labs/theme`. See README.md for the full contract.
 *
 * Required styles (import once at your app root):
 *   import "@peasant-labs/theme/tokens.css";
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

// --- `primitives` surface — shadcn-style UI primitives ---------------------
// Ported from the village viewer redesign and re-expressed in the package's
// `--tb-*` token model (no Tailwind, no Radix). Namespaced to avoid colliding
// with the bespoke transcript primitives above (e.g. both expose a `Tooltip`).
//   import { primitives } from "@peasant-labs/transcript-browser";
export * as primitives from "./ui/index.js";
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
