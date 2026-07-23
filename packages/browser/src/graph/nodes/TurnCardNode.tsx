import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { GraphTurnNode } from "@peasant-labs/fairtrade/ui";
import { NODE_DIMENSIONS } from "../constants.js";
import type { Harness } from "@peasant-labs/schema";
import type { TurnNodeData } from "../types.js";

interface TurnCardNodeData extends TurnNodeData {
  provider?: Harness;
}

/**
 * Turn card used as a React Flow node. After the graph split this is a thin
 * ENGINE wrapper: it keeps the @xyflow <Handle>s + the node's DOM identity
 * (`data-turn-index`) and maps its cooked `TurnNodeData` onto fairtrade's
 * presentation-only `GraphTurnNode`, which renders the body + all aesthetics
 * (role accent, flags, footer). No node markup or styling lives here anymore —
 * the same fairtrade visual renders here and in the mockup, so they stay in
 * lockstep. Topology, layout, selection and handle wiring are unchanged.
 */
function TurnCardNodeImpl({ data, selected }: NodeProps) {
  const d = data as TurnCardNodeData;
  const { turn, annotations, isSearchMatch, isFilteredOut, isSelected, turnNumber, provider } = d;

  const depth = turn.depth ?? 0;
  const isSubagent = turn.role === "assistant" && depth > 0;
  const hasError = annotations.some((a) => a.type === "error");
  const hasRetry = annotations.some((a) => a.type === "retry");
  const hasRevert = annotations.some((a) => a.type === "revert");

  return (
    // Width MUST match NODE_DIMENSIONS.turnWidth (320) so the right source-handle
    // aligns with the edge endpoint computed by the mapper; the fairtrade card
    // fills this shell (width:100%).
    <div
      data-turn-index={turn.index}
      data-harness={isSubagent ? undefined : turn.role === "assistant" ? provider : undefined}
      style={{ width: NODE_DIMENSIONS.turnWidth }}
    >
      <Handle type="target" position={Position.Top} className="tb-gnode-handle tb-gnode-handle-top" />

      <GraphTurnNode
        role={turn.role}
        agentName={isSubagent ? turn.agentName : undefined}
        turnNumber={turnNumber}
        contentPreview={contentPreview(turn.content, 160)}
        toolCount={turn.toolCalls?.length ?? 0}
        totalTokens={(turn.tokensIn ?? 0) + (turn.tokensOut ?? 0)}
        tokensIn={turn.tokensIn ?? undefined}
        tokensOut={turn.tokensOut ?? undefined}
        hasError={hasError}
        hasRetry={hasRetry}
        hasRevert={hasRevert}
        isSearchMatch={isSearchMatch}
        isFilteredOut={isFilteredOut}
        isSelected={selected || isSelected}
        provider={provider}
      />

      <Handle type="source" position={Position.Bottom} className="tb-gnode-handle tb-gnode-handle-bottom" />
      <Handle
        type="source"
        id="tool-source"
        position={Position.Right}
        className="tb-gnode-handle tb-gnode-handle-right"
      />
    </div>
  );
}

function contentPreview(content: string, max: number): string {
  if (!content) return "";
  const oneLine = content.replace(/\s+/g, " ").trim();
  return oneLine.length > max ? oneLine.slice(0, max - 1) + "…" : oneLine;
}

export const TurnCardNode = memo(TurnCardNodeImpl);
