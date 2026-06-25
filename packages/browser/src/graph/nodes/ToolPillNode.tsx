import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { GraphToolNode } from "@peasant-labs/fairtrade/ui";
import { NODE_DIMENSIONS } from "../constants.js";
import type { ToolCallNodeData } from "../types.js";

/**
 * Compact tool-call cluster used as a React Flow node. After the R7 graph split
 * this is a thin ENGINE wrapper: it keeps the @xyflow <Handle> and maps its
 * cooked `ToolCallNodeData` onto fairtrade's presentation-only `GraphToolNode`,
 * which renders the cluster (rows, duration, "+ N more", failed styling).
 *
 * The one-line arg `preview` is the adapter's cooked `ToolCallVM.preview`,
 * threaded in via `data.previewById` — the node NEVER parses
 * `ToolCallDetail.arguments` itself (all wire parsing lives in the fairtrade
 * adapter).
 */
function ToolPillNodeImpl({ data }: NodeProps) {
  const { toolCalls, previewById, totalDurationMs, hasError, isFilteredOut } = data as ToolCallNodeData;

  const tools = toolCalls.map((c) => ({
    id: c.id,
    name: c.name,
    kind: c.toolKind,
    filePath: c.filePath,
    isError: c.isError,
    exitCode: c.exitCode,
    preview: previewById[c.id] ?? "",
  }));

  return (
    // Width MUST match NODE_DIMENSIONS.toolCallWidth (200) so the left
    // target-handle aligns with the turn's right source-handle.
    <div style={{ width: NODE_DIMENSIONS.toolCallWidth }}>
      <Handle type="target" id="tool-target" position={Position.Left} className="tb-gnode-handle tb-gnode-handle-left" />
      <GraphToolNode
        tools={tools}
        totalDurationMs={totalDurationMs}
        hasError={hasError}
        isFilteredOut={isFilteredOut}
      />
    </div>
  );
}

export const ToolPillNode = memo(ToolPillNodeImpl);
