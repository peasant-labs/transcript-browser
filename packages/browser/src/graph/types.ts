import type { TurnDetail, ToolCallDetail } from "@peasant-labs/schema";
import type { Phase, PhaseType } from "../view-types.js";
import type { ToolCallVM } from "@peasant-labs/fairtrade/ui";
import type { TranscriptAnnotation } from "../lib/pattern-detection.js";

/**
 * Graph node + canvas prop types for the trajectory graph. Ported from
 * peasant's `components/session-detail/canvas/types.ts` (the graph topology
 * layer the v2 graph view reused) — lifted into the graph slice since these
 * types are graph-only. Pure data shapes; no `@xyflow/react` import here so the
 * mapper can be tested without the peer dep.
 */

// ---------------------------------------------------------------------------
// Node data types — passed as `data` to custom React Flow nodes
// ---------------------------------------------------------------------------

export interface TurnNodeData {
  turn: TurnDetail;
  annotations: TranscriptAnnotation[];
  phaseType: PhaseType | undefined;
  isSearchMatch: boolean;
  isFilteredOut: boolean;
  isSelected: boolean;
  turnNumber: number;
  tokensCumulative: number;
  searchQuery?: string;
  [key: string]: unknown;
}

export interface ToolCallNodeData {
  turnIndex: number;
  toolCalls: ToolCallDetail[];
  /**
   * Cooked one-line previews keyed by tool-call id — the adapter's
   * `ToolCallVM.preview`, threaded in so the node renders the same arg summary as
   * the list view WITHOUT parsing wire (`ToolCallDetail.arguments`) in the node.
   */
  previewById: Record<string, string>;
  totalDurationMs: number;
  hasError: boolean;
  isFilteredOut: boolean;
  phaseType: PhaseType | undefined;
  [key: string]: unknown;
}

export interface SubagentLaneData {
  depth: number;
  agentName: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Canvas props
// ---------------------------------------------------------------------------

/** Navigation command with a nonce so the same target can be re-triggered. */
export interface NavCommand {
  target: number;
  seq: number;
}

export interface TrajectoryCanvasProps {
  turns: TurnDetail[];
  /**
   * Cooked tool calls keyed by turn index (the adapter's `ToolCallVM[]`). The
   * mapper threads each tool's cooked `preview` into the tool node so the graph
   * never parses wire. Optional: absent ⇒ tool nodes render without arg previews.
   */
  toolVMsByTurn?: Map<number, ToolCallVM[]>;
  filteredTurns: TurnDetail[];
  phases: Phase[];
  annotations: TranscriptAnnotation[];
  searchMatches: number[];
  searchQuery?: string;
  activeMatchIndex?: number;
  /** External command to pan the canvas to a specific turn index. */
  focusTurn?: NavCommand;
  /** External command to fit the canvas to a specific phase index. */
  focusPhase?: NavCommand;
  onPhaseActivate?: (phaseIndex: number) => void;
  onViewportChange?: (range: { start: number; end: number }) => void;
  /** Set of selected turn indices for marquee highlighting. */
  selectedTurns?: Set<number>;
  /** Callback when marquee selection completes with intersected turn indices. */
  onMarqueeSelect?: (indices: number[]) => void;
}
