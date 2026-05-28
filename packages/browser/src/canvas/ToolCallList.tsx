import { ToolCallRow } from "./ToolCallRow.js";
import type { ToolCallDetail } from "@peasant-labs/types";

export interface ToolCallListProps {
  calls: ToolCallDetail[];
  /** When true, every call is rendered expanded. */
  expandAll?: boolean;
}

/**
 * Stacked list of tool calls under a turn. Each row is independently
 * collapsible unless `expandAll` is set.
 */
export function ToolCallList({ calls, expandAll }: ToolCallListProps) {
  if (!calls.length) return null;
  return (
    <div className="tb-toolcall-list">
      {calls.map((c) => (
        // When "Expand all" is on, take over the row's state so the toggle is
        // reactive; otherwise leave it uncontrolled for per-row expansion.
        <ToolCallRow key={c.id} call={c} expanded={expandAll || undefined} />
      ))}
    </div>
  );
}
