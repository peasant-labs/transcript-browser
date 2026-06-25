import { useState } from "react";
import { Brain, ChevronRight } from "@peasant-labs/fairtrade/icons";
import { cn } from "../internal/cn.js";
import { Markdown } from "../primitives/Markdown.js";
import { THINKING_LABEL } from "../lib/labels.js";

export interface ThinkingBlockProps {
  content: string;
  /** Defaults to collapsed; opens on click. */
  defaultExpanded?: boolean;
  className?: string;
}

/**
 * Reasoning / chain-of-thought block. Collapsed by default with a quiet
 * "Thinking" toggle; expands to italic markdown indented inside a hairline box.
 */
export function ThinkingBlock({
  content,
  defaultExpanded = false,
  className,
}: ThinkingBlockProps) {
  const [open, setOpen] = useState(defaultExpanded);
  if (!content?.trim()) return null;
  const wordCount = content.trim().split(/\s+/).length;

  return (
    <div className={cn("tb-thinking", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="tb-thinking-toggle"
      >
        <ChevronRight
          size={12}
          strokeWidth={2}
          className={cn("tb-chevron", open && "tb-chevron-open")}
        />
        <Brain size={12} strokeWidth={1.75} />
        <span className="tb-thinking-italic">{THINKING_LABEL}</span>
        <span className="tb-thinking-words">{wordCount}w</span>
      </button>
      {open && (
        <div className="tb-thinking-body">
          <Markdown>{content}</Markdown>
        </div>
      )}
    </div>
  );
}
