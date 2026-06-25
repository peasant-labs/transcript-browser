import { type ReactNode, useMemo, useState } from "react";
import { cn } from "../internal/cn.js";
import { Markdown } from "../primitives/Markdown.js";
import type { TurnDetail } from "@peasant-labs/types";

export interface TurnContentProps {
  turn: TurnDetail;
  /** Active search term — wrapped in <mark> when it appears. */
  searchQuery?: string;
  /** When false, the content is shown raw (no markdown parsing). */
  markdown?: boolean;
  className?: string;
}

const COLLAPSE_LINES_THRESHOLD = 24;

/**
 * Renders a turn's content body. Long content collapses to ~24 lines with a
 * "Show more" toggle; the user role is rendered slightly heavier than
 * assistant/tool/system for visual weight on the rail.
 */
export function TurnContent({
  turn,
  searchQuery,
  markdown = true,
  className,
}: TurnContentProps) {
  const [expanded, setExpanded] = useState(false);
  const content = turn.content ?? "";
  const lineCount = content ? content.split("\n").length : 0;
  const canCollapse = lineCount > COLLAPSE_LINES_THRESHOLD;
  const visible =
    canCollapse && !expanded
      ? content.split("\n").slice(0, COLLAPSE_LINES_THRESHOLD).join("\n") + "\n…"
      : content;

  // For search, render highlighted plain text instead of markdown so the
  // <mark> insertion is reliable. Otherwise prefer markdown.
  const useMarkdown = markdown && !searchQuery?.trim();
  const highlighted = useMemo(() => {
    if (useMarkdown) return null;
    return renderHighlighted(visible, searchQuery ?? "");
  }, [useMarkdown, visible, searchQuery]);

  if (!content.trim()) return null;

  return (
    <div className={cn("tb-turncontent", className)}>
      {useMarkdown ? (
        <Markdown className={cn(turn.role === "user" && "tb-turncontent-user")}>
          {visible}
        </Markdown>
      ) : (
        <div
          className={cn(
            "tb-prose tb-turncontent-raw",
            turn.role === "user" && "tb-turncontent-user",
          )}
        >
          {highlighted}
        </div>
      )}
      {canCollapse && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="tb-showmore"
        >
          {expanded ? "Show less" : `Show ${lineCount - COLLAPSE_LINES_THRESHOLD} more lines`}
        </button>
      )}
    </div>
  );
}

function renderHighlighted(text: string, q: string): ReactNode {
  if (!q.trim()) return text;
  const lower = q.toLowerCase();
  const pieces: ReactNode[] = [];
  let i = 0;
  let n = 0;
  while (i < text.length) {
    const found = text.toLowerCase().indexOf(lower, i);
    if (found === -1) {
      pieces.push(text.slice(i));
      break;
    }
    if (found > i) pieces.push(text.slice(i, found));
    pieces.push(<mark key={n++}>{text.slice(found, found + q.length)}</mark>);
    i = found + q.length;
  }
  return pieces;
}
