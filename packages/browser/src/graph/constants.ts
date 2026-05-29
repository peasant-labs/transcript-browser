/**
 * Node dimensions, spacing, and edge style constants for the trajectory graph.
 * Ported verbatim from peasant's `components/session-detail/canvas/constants.ts`.
 *
 * Edge colours are concrete values here (React Flow edge `style.stroke` does not
 * resolve CSS custom properties reliably across SVG markers), matching the
 * source. Node/minimap colours that CAN use tokens use `--tb-*` vars.
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
  sequentialColor: "#737373",
  sequentialColorDark: "#525252",
  sequentialWidth: 1.5,
  phaseTransitionWidth: 2,
  subagentSpawnColor: "#404040",
  subagentReturnColor: "#737373",
  errorColor: "#b91c1c",
} as const;
