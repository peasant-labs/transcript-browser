import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "../../internal/cn.js";
import { ToolIcon } from "../../primitives/ToolIcon.js";
import { DurationBadge } from "../../primitives/DurationBadge.js";
import { ErrorPill } from "../../primitives/ErrorPill.js";
import { basename, parseArgs, preview } from "../../canvas/tool-renderers/types.js";
import type { ToolCallNodeData } from "../types.js";

/**
 * Compact monochrome tool-call cluster — sits beside its parent turn card.
 * Shows up to four rows of tool-name + arg preview + duration, then "+ N more".
 * Ported from peasant's `graph/nodes/ToolPillNode.tsx`.
 */
function ToolPillNodeImpl({ data }: NodeProps) {
  const { toolCalls, totalDurationMs, hasError, isFilteredOut } = data as ToolCallNodeData;
  const MAX = 4;
  const visible = toolCalls.slice(0, MAX);
  const remaining = toolCalls.length - visible.length;

  return (
    <div
      className={cn("tb-gnode tb-gnode-tools", isFilteredOut && "tb-gnode-dimmed", hasError && "tb-gnode-error")}
      // Width MUST match NODE_DIMENSIONS.toolCallWidth (200) so the left
      // target-handle aligns with the turn's right source-handle.
      style={{ width: 200 }}
    >
      <Handle type="target" id="tool-target" position={Position.Left} className="tb-gnode-handle tb-gnode-handle-left" />

      <header className="tb-gnode-tools-head">
        <span className="tb-eyebrow">
          {toolCalls.length === 1 ? "Tool call" : `${toolCalls.length} tool calls`}
        </span>
        {totalDurationMs > 0 && <DurationBadge ms={totalDurationMs} />}
      </header>

      <ul className="tb-gnode-tools-list">
        {visible.map((c) => {
          const argLine = makePreview(c);
          const failed = c.isError || (c.exitCode != null && c.exitCode !== 0);
          return (
            <li key={c.id} className={cn("tb-gnode-tools-row", failed && "tb-gnode-tools-row-failed")}>
              <ToolIcon name={c.name} kind={c.toolKind} size={11} className={failed ? "tb-toolicon-failed" : "tb-toolicon-muted"} />
              <span className={cn("tb-gnode-tools-name", failed && "tb-toolcall-name-failed")}>{c.name}</span>
              {argLine && <span className="tb-gnode-tools-arg tb-truncate">{argLine}</span>}
              {failed && <ErrorPill className="tb-gnode-tools-err" />}
            </li>
          );
        })}
        {remaining > 0 && <li className="tb-gnode-tools-more">+ {remaining} more</li>}
      </ul>
    </div>
  );
}

function makePreview(call: { filePath?: string; arguments: string; name: string }): string {
  if (call.filePath) return basename(call.filePath);
  const obj = parseArgs<Record<string, unknown>>(call.arguments);
  if (!obj) return preview(call.arguments, 38);
  if (typeof obj.file_path === "string") return basename(obj.file_path);
  if (typeof obj.command === "string") return preview(obj.command, 42);
  if (typeof obj.pattern === "string") return `"${preview(obj.pattern, 32)}"`;
  if (typeof obj.url === "string") return preview(obj.url, 42);
  if (typeof obj.query === "string") return preview(obj.query, 42);
  if (typeof obj.subject === "string") return preview(obj.subject, 42);
  if (typeof obj.description === "string") return preview(obj.description, 42);
  return preview(call.arguments, 38);
}

export const ToolPillNode = memo(ToolPillNodeImpl);
