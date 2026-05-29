import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ReactFlow,
  MiniMap,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type NodeTypes,
} from "@xyflow/react";
import type { Provider } from "@peasant-labs/types";
import { cn } from "../internal/cn.js";
import { turnsToFlow, computeLaneHeaders } from "./turnsToFlow.js";
import { useCanvasSync } from "./useCanvasSync.js";
import { NODE_DIMENSIONS, EDGE_DEFAULTS } from "./constants.js";
import type { TrajectoryCanvasProps, TurnNodeData } from "./types.js";
import { TurnCardNode } from "./nodes/TurnCardNode.js";
import { ToolPillNode } from "./nodes/ToolPillNode.js";
import { SubagentBranchNode } from "./nodes/SubagentBranchNode.js";
import { GraphControls } from "./GraphControls.js";
import { GraphLegend } from "./GraphLegend.js";

const nodeTypes: NodeTypes = {
  turn: TurnCardNode,
  toolCall: ToolPillNode,
  subagentLane: SubagentBranchNode,
};

export interface TrajectoryGraphProps extends TrajectoryCanvasProps {
  provider?: Provider;
  className?: string;
}

/**
 * The trajectory graph view. Reuses the `turnsToFlow` mapper so topology stays
 * consistent with the list view, but every visual element is rebuilt in the
 * monochrome `--tb-*` system. Ported from peasant's `graph/TrajectoryGraph.tsx`.
 *
 * `@xyflow/react` is a PEER DEPENDENCY of this package — the host installs it
 * (and imports `@xyflow/react/dist/style.css` once) only if it mounts the graph.
 */
export function TrajectoryGraph(props: TrajectoryGraphProps) {
  return (
    <ReactFlowProvider>
      <Inner {...props} />
    </ReactFlowProvider>
  );
}

function Inner({
  turns,
  filteredTurns,
  phases,
  annotations,
  searchMatches,
  searchQuery,
  activeMatchIndex,
  focusTurn: focusTurnCmd,
  focusPhase: focusPhaseCmd,
  onPhaseActivate,
  onViewportChange,
  selectedTurns,
  provider,
  className,
}: TrajectoryGraphProps) {
  const rf = useReactFlow();
  const { focusTurn, focusPhase } = useCanvasSync(phases, turns, onPhaseActivate);

  const filteredIndices = useMemo(() => {
    if (filteredTurns.length === turns.length) return new Set<number>();
    const filteredSet = new Set(filteredTurns);
    const positions = new Set<number>();
    for (let i = 0; i < turns.length; i++) {
      if (filteredSet.has(turns[i]!)) positions.add(i);
    }
    return positions;
  }, [turns, filteredTurns]);

  const flowGraph = useMemo(
    () =>
      turnsToFlow({
        turns,
        phases,
        annotations,
        searchMatches,
        filteredIndices,
        searchQuery,
        selectedTurns,
      }),
    [turns, phases, annotations, searchMatches, filteredIndices, searchQuery, selectedTurns],
  );

  const nodesWithProvider = useMemo(
    () =>
      flowGraph.nodes.map((n) =>
        n.type === "turn" ? { ...n, data: { ...n.data, provider } } : n,
      ),
    [flowGraph.nodes, provider],
  );

  const laneHeaderNodes = useMemo(() => computeLaneHeaders(nodesWithProvider), [nodesWithProvider]);

  const edges = useMemo(
    () =>
      flowGraph.edges.map((e) => {
        const isToolEdge = e.sourceHandle === "tool-source";
        return {
          ...e,
          style: {
            ...e.style,
            stroke: isToolEdge ? "#a3a3a3" : EDGE_DEFAULTS.sequentialColor,
            strokeWidth: isToolEdge ? 1 : EDGE_DEFAULTS.sequentialWidth,
          },
          animated: false,
        };
      }),
    [flowGraph.edges],
  );

  const allNodes = useMemo(
    () => [...laneHeaderNodes, ...nodesWithProvider],
    [laneHeaderNodes, nodesWithProvider],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(allNodes);
  const [edgeState, setEdges, onEdgesChange] = useEdgesState(edges);

  const prevTurnsLen = useRef(turns.length);
  const prevSearchQuery = useRef(searchQuery);
  const prevFilteredLen = useRef(filteredTurns.length);
  useEffect(() => {
    const changed =
      turns.length !== prevTurnsLen.current ||
      searchQuery !== prevSearchQuery.current ||
      filteredTurns.length !== prevFilteredLen.current;
    if (changed) {
      setNodes(allNodes);
      setEdges(edges);
      prevTurnsLen.current = turns.length;
      prevSearchQuery.current = searchQuery;
      prevFilteredLen.current = filteredTurns.length;
    }
  }, [allNodes, edges, turns.length, searchQuery, filteredTurns.length, setNodes, setEdges]);

  useEffect(() => {
    if (activeMatchIndex === undefined) return;
    const entryIdx = turns[activeMatchIndex]?.index;
    if (entryIdx === undefined) return;
    const match = nodes.find(
      (n) => n.type === "turn" && (n.data as TurnNodeData).turn.index === entryIdx,
    );
    if (match) {
      rf.setCenter(
        match.position.x + NODE_DIMENSIONS.turnWidth / 2,
        match.position.y + NODE_DIMENSIONS.turnBaseHeight / 2,
        { zoom: 1, duration: 350 },
      );
    }
  }, [activeMatchIndex, nodes, rf, turns]);

  const prevFocusTurnSeq = useRef(-1);
  useEffect(() => {
    if (!focusTurnCmd || focusTurnCmd.seq === prevFocusTurnSeq.current) return;
    prevFocusTurnSeq.current = focusTurnCmd.seq;
    focusTurn(focusTurnCmd.target);
  }, [focusTurnCmd, focusTurn]);
  const prevFocusPhaseSeq = useRef(-1);
  useEffect(() => {
    if (!focusPhaseCmd || focusPhaseCmd.seq === prevFocusPhaseSeq.current) return;
    prevFocusPhaseSeq.current = focusPhaseCmd.seq;
    focusPhase(focusPhaseCmd.target);
  }, [focusPhaseCmd, focusPhase]);

  const fitted = useRef(false);
  useEffect(() => {
    if (nodes.length > 0 && !fitted.current) {
      fitted.current = true;
      setTimeout(() => {
        const first = nodes.find((n) => n.type === "turn");
        if (first) {
          rf.setCenter(
            first.position.x + NODE_DIMENSIONS.turnWidth / 2,
            first.position.y + NODE_DIMENSIONS.turnBaseHeight,
            { zoom: 1.05, duration: 300 },
          );
        } else {
          rf.fitView({ padding: 0.1, duration: 300 });
        }
      }, 100);
    }
  }, [nodes.length, rf, nodes]);

  const minimapNodeColor = useCallback((n: { type?: string; data: Record<string, unknown> }) => {
    if (n.type === "turn") {
      const d = n.data as TurnNodeData;
      const hasErr = d.annotations?.some?.((a) => a.type === "error");
      if (hasErr) return "var(--tb-negative)";
      if (d.isFilteredOut) return "var(--tb-rule)";
      if (d.turn.role === "user") return "var(--tb-ink)";
      return "var(--tb-ink-2)";
    }
    if (n.type === "toolCall") return "var(--tb-ink-3)";
    return "var(--tb-rule)";
  }, []);

  const onNodeClick = useCallback(
    (_e: React.MouseEvent, n: { type?: string; data: Record<string, unknown> }) => {
      if (n.type !== "turn") return;
      const d = n.data as TurnNodeData;
      onViewportChange?.({ start: d.turn.index, end: d.turn.index });
    },
    [onViewportChange],
  );

  return (
    <div className={cn("tb-root tb-graph", className)}>
      <div className="tb-graph-flow">
        <ReactFlow
          nodes={nodes}
          edges={edgeState}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView={false}
          minZoom={0.2}
          maxZoom={2}
          defaultEdgeOptions={{
            style: { stroke: EDGE_DEFAULTS.sequentialColor, strokeWidth: EDGE_DEFAULTS.sequentialWidth },
          }}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          nodesConnectable={false}
          edgesFocusable={false}
          selectNodesOnDrag={false}
          panOnDrag
          panOnScroll
          zoomOnScroll
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--tb-rule)" />
          <MiniMap
            zoomable
            pannable
            nodeColor={minimapNodeColor}
            nodeStrokeColor="var(--tb-rule)"
            nodeBorderRadius={0}
            maskColor="color-mix(in srgb, var(--tb-canvas) 70%, transparent)"
            className="tb-graph-minimap"
          />
        </ReactFlow>
        <GraphControls />
        <GraphLegend provider={provider} />
      </div>
    </div>
  );
}
