import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "../internal/cn.js";
import { ToolIcon } from "../primitives/ToolIcon.js";
import { DurationBadge } from "../primitives/DurationBadge.js";
import { ErrorPill } from "../primitives/ErrorPill.js";
import { rendererFor } from "./tool-renderers/index.js";
import { preview, parseArgs, basename } from "./tool-renderers/types.js";
import type { ToolCallDetail } from "@peasant-labs/types";

export interface ToolCallRowProps {
  call: ToolCallDetail;
  /** When true, the row starts expanded. */
  defaultExpanded?: boolean;
  /** When set, callers control expansion explicitly (otherwise local state). */
  expanded?: boolean;
  onToggle?: (next: boolean) => void;
  /** Optional onClick for the heading row beyond toggling. */
  onClick?: () => void;
  className?: string;
}

/**
 * A single tool invocation rendered as a clickable, collapsible row.
 *
 * Collapsed: icon + tool name + arg preview + duration + status. One line.
 * Expanded: tool-specific renderer (Read shows file, Edit shows diff, etc).
 */
export function ToolCallRow({
  call,
  defaultExpanded = false,
  expanded: controlled,
  onToggle,
  onClick,
  className,
}: ToolCallRowProps) {
  const [localOpen, setLocalOpen] = useState(defaultExpanded);
  const expanded = controlled ?? localOpen;
  const Renderer = rendererFor(call);
  const argLine = makePreview(call);
  const failed = call.isError || (call.exitCode != null && call.exitCode !== 0);

  function toggle() {
    onClick?.();
    if (controlled !== undefined) {
      onToggle?.(!controlled);
    } else {
      const next = !localOpen;
      setLocalOpen(next);
      onToggle?.(next);
    }
  }

  return (
    <div className={cn("tb-toolcall", className)}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        className={cn("tb-toolcall-head tb-focus", failed && "tb-toolcall-head-failed")}
      >
        <ChevronRight
          size={12}
          strokeWidth={2}
          className={cn("tb-toolcall-chevron", expanded && "tb-chevron-open")}
        />
        <ToolIcon
          name={call.name}
          kind={call.toolKind}
          size={13}
          className={failed ? "tb-toolicon-failed" : "tb-toolicon-muted"}
        />
        <span className={cn("tb-toolcall-name", failed && "tb-toolcall-name-failed")}>
          {call.name}
        </span>
        {argLine && <span className="tb-toolcall-arg">{argLine}</span>}
        <span className="tb-toolcall-meta">
          <DurationBadge ms={call.durationMs} />
          {failed && <ErrorPill />}
        </span>
      </button>
      {expanded && (
        <div className="tb-toolcall-body">
          <Renderer call={call} />
        </div>
      )}
    </div>
  );
}

/**
 * Produce a one-line summary of the tool call's arguments for the collapsed
 * row. Different tools merit different summaries; the default lifts the
 * shortest field from the parsed JSON.
 */
function makePreview(call: ToolCallDetail): string {
  if (call.filePath) return basename(call.filePath);
  const obj = parseArgs<Record<string, unknown>>(call.arguments);
  if (!obj) return preview(call.arguments, 80);
  if (typeof obj.file_path === "string") return basename(obj.file_path);
  if (typeof obj.command === "string") return preview(obj.command, 100);
  if (typeof obj.pattern === "string") return `"${preview(obj.pattern, 60)}"`;
  if (typeof obj.url === "string") return obj.url as string;
  if (typeof obj.query === "string") return preview(obj.query, 100);
  if (typeof obj.description === "string") return preview(obj.description, 100);
  if (typeof obj.subject === "string") return preview(obj.subject, 100);
  if (typeof obj.prompt === "string") return preview(obj.prompt, 100);
  return preview(call.arguments, 80);
}
