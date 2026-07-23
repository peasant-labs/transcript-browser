import type { Node, Edge } from "@xyflow/react";
import type { TurnDetail } from "@peasant-labs/schema";
import type { Phase, PhaseType } from "../view-types.js";
import type { TranscriptAnnotation } from "../lib/pattern-detection.js";
import type { TurnNodeData, ToolCallNodeData } from "./types.js";
import type { ToolCallVM } from "@peasant-labs/fairtrade/ui";
import { NODE_DIMENSIONS, EDGE_DEFAULTS } from "./constants.js";

/**
 * Transform a turn list into a React Flow `{ nodes, edges }` graph. Ported
 * verbatim from peasant's `canvas/mappers/turnsToFlow.ts`. Pure data transform;
 * the only external type is `@xyflow/react`'s `Node`/`Edge` (a peer dependency).
 */

type EdgeType = "sequential" | "phase-transition" | "spawn" | "return" | "turn-to-tool" | "error";
interface CanvasEdgeData {
  edgeType: EdgeType;
  phaseColor?: string;
  [key: string]: unknown;
}
interface FlowGraph {
  nodes: Node[];
  edges: Edge[];
}

// All phases resolve to neutral except error/retry-loop which use the danger tint.
const PHASE_EDGE_COLOR: Record<PhaseType, string> = {
  planning: "var(--edge)",
  exploration: "var(--edge)",
  implementation: "var(--edge)",
  testing: "var(--edge)",
  error: "var(--edge-error)",
  debug: "var(--edge)",
  "retry-loop": "var(--edge-error)",
  "user-correction": "var(--edge)",
  recovery: "var(--edge)",
  abandonment: "var(--edge)",
};

function buildAnnotationMap(
  annotations: TranscriptAnnotation[],
): Map<number, TranscriptAnnotation[]> {
  const map = new Map<number, TranscriptAnnotation[]>();
  for (const ann of annotations) {
    const existing = map.get(ann.turnIndex) ?? [];
    existing.push(ann);
    map.set(ann.turnIndex, existing);
  }
  return map;
}

function buildPhaseLookup(phases: Phase[]): Map<number, PhaseType> {
  const map = new Map<number, PhaseType>();
  for (const phase of phases) {
    for (let i = phase.startTurn; i <= phase.endTurn; i++) {
      map.set(i, phase.type);
    }
  }
  return map;
}

export interface TurnsToFlowOptions {
  turns: TurnDetail[];
  /** Cooked tool calls by turn index — supplies each tool node's preview. */
  toolVMsByTurn?: Map<number, ToolCallVM[]>;
  phases: Phase[];
  annotations: TranscriptAnnotation[];
  searchMatches: number[];
  filteredIndices: Set<number>;
  searchQuery?: string;
  selectedTurns?: Set<number>;
}

export function turnsToFlow({
  turns,
  toolVMsByTurn,
  phases,
  annotations,
  searchMatches,
  filteredIndices,
  searchQuery,
  selectedTurns,
}: TurnsToFlowOptions): FlowGraph {
  const annotationMap = buildAnnotationMap(annotations);
  const phaseLookup = buildPhaseLookup(phases);
  const searchSet = new Set(searchMatches);

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  let currentY = 0;
  let cumulativeTokens = 0;
  let prevNodeId: string | null = null;
  let prevPhaseType: PhaseType | undefined;
  let prevDepth = 0;
  let prevFilteredOut = false;

  for (let ti = 0; ti < turns.length; ti++) {
    const turn = turns[ti]!;
    // Skip empty system turns (no content, no tools) — they produce blank cards.
    const hasContent = !!turn.content?.trim();
    const hasTools = (turn.toolCalls?.length ?? 0) > 0;
    if (!hasContent && !hasTools) continue;
    if (turn.role === "system" && !hasTools && (!turn.content || turn.content.trim().length < 8)) continue;

    const depth = turn.depth ?? 0;
    // Phase lookup, search matches, and filtered indices all use display positions (ti).
    const phaseType = phaseLookup.get(ti);
    const turnAnnotations = annotationMap.get(ti) ?? [];
    const isSearchMatch = searchSet.has(ti);
    const isFilteredOut = filteredIndices.size > 0 && !filteredIndices.has(ti);

    cumulativeTokens += (turn.tokensIn ?? 0) + (turn.tokensOut ?? 0);

    const x = depth * NODE_DIMENSIONS.subagentIndent;
    const y = currentY;

    const turnNodeId = `turn-${turn.index}`;
    const turnNodeData: TurnNodeData = {
      turn,
      annotations: turnAnnotations,
      phaseType,
      isSearchMatch,
      isFilteredOut,
      isSelected: selectedTurns?.has(turn.index) ?? false,
      turnNumber: turn.index + 1,
      tokensCumulative: cumulativeTokens,
      searchQuery: isSearchMatch ? searchQuery : undefined,
    };

    nodes.push({
      id: turnNodeId,
      type: "turn",
      position: { x, y },
      data: turnNodeData,
      style: { width: NODE_DIMENSIONS.turnWidth },
    });

    const toolCalls = turn.toolCalls ?? [];
    if (toolCalls.length > 0) {
      const toolNodeId = `tools-${turn.index}`;
      const totalDuration = toolCalls.reduce((sum, tc) => sum + (tc.durationMs ?? 0), 0);
      const hasError = toolCalls.some(
        (tc) => tc.isError || (tc.exitCode !== undefined && tc.exitCode !== 0),
      );

      // Cooked one-line previews for this turn's tools (no wire parse in the node).
      const previewById: Record<string, string> = {};
      for (const tc of toolVMsByTurn?.get(turn.index) ?? []) previewById[tc.id] = tc.preview;

      const toolNodeData: ToolCallNodeData = {
        turnIndex: turn.index,
        toolCalls,
        previewById,
        totalDurationMs: totalDuration,
        hasError,
        isFilteredOut,
        phaseType,
      };

      const toolX = x + NODE_DIMENSIONS.turnWidth + NODE_DIMENSIONS.toolSideGap;
      const toolY = y + (NODE_DIMENSIONS.turnBaseHeight - NODE_DIMENSIONS.toolCallHeight) / 2;

      nodes.push({
        id: toolNodeId,
        type: "toolCall",
        position: { x: toolX, y: toolY },
        data: toolNodeData,
        style: { width: NODE_DIMENSIONS.toolCallWidth },
      });

      edges.push({
        id: `e-${turnNodeId}-${toolNodeId}`,
        source: turnNodeId,
        sourceHandle: "tool-source",
        target: toolNodeId,
        targetHandle: "tool-target",
        type: "straight",
        style: {
          stroke: "var(--edge)",
          strokeWidth: 1,
          strokeDasharray: "4 4",
          ...(isFilteredOut ? { opacity: 0.2 } : {}),
        },
        data: { edgeType: "turn-to-tool" as const } satisfies CanvasEdgeData,
      });
    }

    if (prevNodeId) {
      const isPhaseTransition = phaseType !== prevPhaseType && phaseType !== undefined;
      const isCrossLane = depth !== prevDepth;

      let edgeType: CanvasEdgeData["edgeType"] = "sequential";
      let strokeColor: string = EDGE_DEFAULTS.sequentialColor;
      let strokeWidth: number = EDGE_DEFAULTS.sequentialWidth;
      let strokeDasharray: string | undefined;

      if (isCrossLane && depth > prevDepth) {
        edgeType = "spawn";
        strokeColor = EDGE_DEFAULTS.subagentSpawnColor;
        strokeWidth = 2;
        strokeDasharray = "6 4";
      } else if (isCrossLane && depth < prevDepth) {
        edgeType = "return";
        strokeColor = EDGE_DEFAULTS.subagentReturnColor;
        strokeWidth = 1.5;
        strokeDasharray = "2 3";
      } else if (isPhaseTransition && phaseType) {
        edgeType = "phase-transition";
        strokeColor = PHASE_EDGE_COLOR[phaseType] ?? EDGE_DEFAULTS.sequentialColor;
        strokeWidth = EDGE_DEFAULTS.phaseTransitionWidth;
      }

      const hasErrors = turnAnnotations.some((a) => a.type === "error");
      if (hasErrors) {
        edgeType = "error";
        strokeColor = EDGE_DEFAULTS.errorColor;
        strokeWidth = 2;
      }

      const edgeDimmed = isFilteredOut || prevFilteredOut;
      edges.push({
        id: `e-${prevNodeId}-${turnNodeId}`,
        source: prevNodeId,
        target: turnNodeId,
        type: "smoothstep",
        animated: edgeType === "error" && !edgeDimmed,
        style: {
          stroke: strokeColor,
          strokeWidth,
          ...(strokeDasharray ? { strokeDasharray } : {}),
          ...(edgeDimmed ? { opacity: 0.15 } : {}),
        },
        data: {
          edgeType,
          phaseColor: phaseType ? PHASE_EDGE_COLOR[phaseType] : undefined,
        } satisfies CanvasEdgeData,
      });
    }

    currentY = y + NODE_DIMENSIONS.turnBaseHeight + NODE_DIMENSIONS.verticalGap;

    prevNodeId = turnNodeId;
    prevPhaseType = phaseType;
    prevDepth = depth;
    prevFilteredOut = isFilteredOut;
  }

  return { nodes, edges };
}

/**
 * Compute lane header nodes for subagent lanes. Ported from peasant's
 * `canvas/mappers/phaseRegions.ts`.
 */
export function computeLaneHeaders(turnNodes: Node[]): Node[] {
  const lanes = new Map<number, { agentName: string; x: number; minY: number }>();

  for (const node of turnNodes) {
    if (node.type !== "turn") continue;
    const turnData = node.data as TurnNodeData;
    const depth = turnData.turn.depth ?? 0;
    if (depth === 0) continue; // No header for main lane

    const existing = lanes.get(depth);
    if (!existing || node.position.y < existing.minY) {
      lanes.set(depth, {
        agentName: turnData.turn.agentName ?? `Agent ${depth}`,
        x: node.position.x,
        minY: node.position.y,
      });
    }
  }

  const headers: Node[] = [];
  for (const [depth, { agentName, x, minY }] of lanes) {
    headers.push({
      id: `lane-header-${depth}`,
      type: "subagentLane",
      position: { x, y: minY - 32 },
      data: { depth, agentName },
      selectable: false,
      draggable: false,
    });
  }

  return headers;
}
