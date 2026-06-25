/**
 * Node dimensions, spacing, and edge style constants for the trajectory graph.
 * Ported verbatim from peasant's `components/session-detail/canvas/constants.ts`.
 *
 * Edge colours use viewer-specific fairtrade extras declared locally in
 * styles.css (`--edge` and `--edge-error`).
 */

export const NODE_DIMENSIONS = {
  turnWidth: 320,
  turnBaseHeight: 120,
  toolCallWidth: 200,
  toolCallHeight: 48,
  laneGap: 40,
  verticalGap: 24,
  /** Horizontal gap between turn card and its tool call node on the right. */
  toolSideGap: 24,
  /** Horizontal indent per subagent depth level. */
  subagentIndent: 48,
  phasePadding: 12,
} as const;

export const EDGE_DEFAULTS = {
  sequentialColor: "var(--edge)",
  sequentialColorDark: "var(--edge)",
  sequentialWidth: 1.5,
  phaseTransitionWidth: 2,
  subagentSpawnColor: "var(--edge)",
  subagentReturnColor: "var(--edge)",
  errorColor: "var(--edge-error)",
} as const;
