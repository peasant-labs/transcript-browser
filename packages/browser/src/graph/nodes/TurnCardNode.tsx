import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "../../internal/cn.js";
import { Tooltip } from "../../internal/Tooltip.js";
import { RoleGlyph } from "../../primitives/RoleGlyph.js";
import { ProviderIcon } from "../../primitives/ProviderIcon.js";
import { TokenBadge } from "../../primitives/TokenBadge.js";
import { ErrorPill } from "../../primitives/ErrorPill.js";
import { formatRelative } from "../../lib/time.js";
import type { Provider } from "@peasant-labs/types";
import type { TurnNodeData } from "../types.js";

const RETRY_EXPLANATION =
  "The agent repeated a similar action after it did not work the first time. Retry loops often signal a confusing or under-specified task.";
const REVERT_EXPLANATION =
  "An earlier edit was undone or rewritten. Reverts mean the agent changed its mind, which can hint at a wrong first approach.";

interface TurnCardNodeData extends TurnNodeData {
  provider?: Provider;
}

const ROLE_LABEL: Record<string, string> = {
  user: "You",
  assistant: "Assistant",
  tool: "Tool",
  system: "System",
};

/**
 * Monochrome turn card used as a React Flow node. The shape encodes role (glyph
 * + label); visual weight is carried by typography and a single left rule.
 * Ported from peasant's `graph/nodes/TurnCardNode.tsx`.
 */
function TurnCardNodeImpl({ data, selected }: NodeProps) {
  const d = data as TurnCardNodeData;
  const { turn, annotations, isSearchMatch, isFilteredOut, isSelected, turnNumber, provider } = d;

  const depth = turn.depth ?? 0;
  const isSubagent = turn.role === "assistant" && depth > 0;
  const hasErrors = annotations.some((a) => a.type === "error");
  const hasRetry = annotations.some((a) => a.type === "retry");
  const hasRevert = annotations.some((a) => a.type === "revert");
  const roleLabel = isSubagent && turn.agentName ? turn.agentName : (ROLE_LABEL[turn.role] ?? turn.role);
  const previewText = contentPreview(turn.content, 160);
  const toolCount = turn.toolCalls?.length ?? 0;
  const totalTokens = (turn.tokensIn ?? 0) + (turn.tokensOut ?? 0);
  const useProviderIcon = turn.role === "assistant" && !isSubagent && !!provider;

  return (
    <div
      data-turn-index={turn.index}
      className={cn(
        "tb-gnode tb-gnode-turn",
        isFilteredOut && "tb-gnode-dimmed",
        isSearchMatch && "tb-gnode-match",
        (selected || isSelected) && "tb-gnode-selected",
        hasErrors && "tb-gnode-error",
      )}
      // Width MUST match NODE_DIMENSIONS.turnWidth (320) so the right
      // source-handle aligns with the edge endpoint computed by the mapper.
      style={{ width: 320 }}
    >
      <Handle type="target" position={Position.Top} className="tb-gnode-handle tb-gnode-handle-top" />

      <header className="tb-gnode-head">
        <span className="tb-gnode-glyph">
          {useProviderIcon ? (
            <ProviderIcon provider={provider!} size={12} />
          ) : (
            <RoleGlyph
              role={isSubagent ? "subagent" : (turn.role as "user" | "assistant" | "tool" | "system")}
              size={11}
            />
          )}
        </span>
        <span className="tb-gnode-role tb-truncate">{roleLabel}</span>
        <span className="tb-gnode-num">#{turnNumber}</span>
        <span className="tb-gnode-head-meta">
          {hasErrors && <ErrorPill />}
          {!hasErrors && hasRetry && (
            <Tooltip content={RETRY_EXPLANATION}>
              <span className="tb-gnode-flag">
                <span className="tb-eyebrow tb-gnode-flag-text">Retry</span>
              </span>
            </Tooltip>
          )}
          {!hasErrors && !hasRetry && hasRevert && (
            <Tooltip content={REVERT_EXPLANATION}>
              <span className="tb-gnode-flag">
                <span className="tb-eyebrow tb-gnode-flag-text">Re-edit</span>
              </span>
            </Tooltip>
          )}
        </span>
      </header>

      {previewText && (
        <div className={cn("tb-gnode-preview", turn.role === "user" && "tb-gnode-preview-user")}>
          {previewText}
        </div>
      )}

      <footer className="tb-gnode-foot">
        {toolCount > 0 && (
          <span title={`${toolCount} tool call${toolCount === 1 ? "" : "s"}`}>
            {toolCount} {toolCount === 1 ? "tool" : "tools"}
          </span>
        )}
        <TokenBadge tokens={totalTokens || undefined} tokensIn={turn.tokensIn} tokensOut={turn.tokensOut} />
        <span className="tb-gnode-time">{formatRelative(turn.timestamp)}</span>
      </footer>

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
