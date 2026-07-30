import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { GraphSubagentBranch } from "@peasant-labs/fairtrade/ui";
import type { SubagentLaneData } from "../types.js";

/**
 * Branch header for a subagent swimlane, used as a React Flow node. This thin
 * engine wrapper maps its `SubagentLaneData` onto
 * fairtrade's presentation-only `GraphSubagentBranch` (the lane header has no
 * handles). Topology/positioning is unchanged — the engine still places the lane.
 */
function SubagentBranchNodeImpl({ data }: NodeProps) {
  const { agentName, depth } = data as SubagentLaneData;
  return <GraphSubagentBranch agentName={agentName} depth={depth} />;
}

export const SubagentBranchNode = memo(SubagentBranchNodeImpl);
