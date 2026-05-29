import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import type { TurnDetail, Phase } from "@peasant-labs/types";
import type { TurnNodeData } from "./types.js";
import { NODE_DIMENSIONS } from "./constants.js";

/**
 * Bidirectional sync between the graph viewport and external controls. Ported
 * verbatim from peasant's `canvas/hooks/useCanvasSync.ts`.
 *
 * Phase startTurn/endTurn are display positions (array indices into turns[]).
 * Graph nodes use turn.index (entry index). The turns array bridges the two.
 */
export function useCanvasSync(
  phases: Phase[],
  turns: TurnDetail[],
  onPhaseActivate?: (phaseIndex: number) => void,
) {
  const reactFlow = useReactFlow();

  const focusPhase = useCallback(
    (phaseIndex: number) => {
      const phase = phases[phaseIndex];
      if (!phase) return;

      const entryIndices = new Set<number>();
      for (let di = phase.startTurn; di <= phase.endTurn; di++) {
        if (turns[di]) entryIndices.add(turns[di]!.index);
      }

      const nodes = reactFlow.getNodes();
      const phaseNodes = nodes.filter((n) => {
        if (n.type !== "turn") return false;
        const data = n.data as TurnNodeData;
        return entryIndices.has(data.turn.index);
      });

      if (phaseNodes.length === 0) return;

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const n of phaseNodes) {
        minX = Math.min(minX, n.position.x);
        minY = Math.min(minY, n.position.y);
        maxX = Math.max(maxX, n.position.x + NODE_DIMENSIONS.turnWidth);
        maxY = Math.max(maxY, n.position.y + NODE_DIMENSIONS.turnBaseHeight);
      }

      reactFlow.fitBounds(
        { x: minX - 20, y: minY - 20, width: maxX - minX + 40, height: maxY - minY + 40 },
        { padding: 0.1, duration: 400 },
      );

      onPhaseActivate?.(phaseIndex);
    },
    [phases, turns, reactFlow, onPhaseActivate],
  );

  const focusTurn = useCallback(
    (turnIndex: number) => {
      const entryIdx = turns[turnIndex]?.index ?? turnIndex;
      const nodes = reactFlow.getNodes();
      const node = nodes.find(
        (n) => n.type === "turn" && (n.data as TurnNodeData).turn.index === entryIdx,
      );
      if (node) {
        reactFlow.setCenter(
          node.position.x + NODE_DIMENSIONS.turnWidth / 2,
          node.position.y + NODE_DIMENSIONS.turnBaseHeight / 2,
          { zoom: 1, duration: 300 },
        );
      }
    },
    [reactFlow, turns],
  );

  return { focusPhase, focusTurn };
}
