import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { RoleGlyph } from "../../primitives/RoleGlyph.js";
import type { SubagentLaneData } from "../types.js";

/**
 * Branch header for a subagent swimlane. Marks the start of a nested agent's
 * turns. Monochrome. Ported from peasant's `graph/nodes/SubagentBranchNode.tsx`.
 */
function SubagentBranchNodeImpl({ data }: NodeProps) {
  const { agentName, depth } = data as SubagentLaneData;
  return (
    <div className="tb-gnode-lane">
      <RoleGlyph role="subagent" size={12} className="tb-toolicon-muted tb-shrink-0" />
      <span className="tb-eyebrow tb-gnode-lane-eyebrow">Subagent</span>
      <span className="tb-gnode-lane-name">{agentName}</span>
      <span className="tb-gnode-lane-depth">d{depth}</span>
    </div>
  );
}

export const SubagentBranchNode = memo(SubagentBranchNodeImpl);
