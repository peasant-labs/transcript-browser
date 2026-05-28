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
 * The primary entry point is `<TranscriptCanvas turns={detail.turns} … />`.
 */

export * from "./primitives/index.js";
export * from "./canvas/index.js";

// Pure helpers re-exported for hosts that want to share the viewer's logic
// (e.g. an outline rail that must agree with the inline turn labels).
export { computeTasks, computeTurnLabels, type TaskGroup } from "./lib/tasks.js";
export { phaseLabel } from "./lib/phase.js";
export { formatRelative, formatDurationMins, formatDateLong } from "./lib/time.js";

// Re-export the shared transcript types so consumers have a single import path.
export type {
  SessionDetailPayload,
  TurnDetail,
  ToolCallDetail,
  SessionCommit,
  SessionGitContext,
  Provider,
  Role,
  Phase,
  PhaseType,
} from "@peasant-labs/types";
