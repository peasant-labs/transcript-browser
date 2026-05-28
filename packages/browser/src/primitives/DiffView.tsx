import { useMemo } from "react";
import { diffLines } from "diff";
import { cn } from "../internal/cn.js";

export interface DiffViewProps {
  oldText: string;
  newText: string;
  filePath?: string;
  /** Maximum visible lines before scrolling; 0 = no cap. */
  maxLines?: number;
  className?: string;
}

interface RenderLine {
  kind: "add" | "del" | "context";
  oldNum: number | null;
  newNum: number | null;
  text: string;
}

/**
 * Unified inline diff renderer. The only place red/green tints appear in the
 * design — driven by the `--tb-diff-*` tokens.
 */
export function DiffView({
  oldText,
  newText,
  filePath,
  maxLines = 200,
  className,
}: DiffViewProps) {
  const lines = useMemo<RenderLine[]>(() => {
    const parts = diffLines(oldText ?? "", newText ?? "");
    const out: RenderLine[] = [];
    let oldNum = 1;
    let newNum = 1;
    for (const part of parts) {
      const partLines = part.value.split("\n");
      // diffLines includes a trailing empty string when the chunk ends with \n.
      if (partLines.length > 0 && partLines[partLines.length - 1] === "") partLines.pop();
      for (const text of partLines) {
        if (part.added) {
          out.push({ kind: "add", oldNum: null, newNum: newNum++, text });
        } else if (part.removed) {
          out.push({ kind: "del", oldNum: oldNum++, newNum: null, text });
        } else {
          out.push({ kind: "context", oldNum: oldNum++, newNum: newNum++, text });
        }
      }
    }
    return out;
  }, [oldText, newText]);

  const stats = useMemo(() => {
    let adds = 0;
    let dels = 0;
    for (const l of lines) {
      if (l.kind === "add") adds++;
      else if (l.kind === "del") dels++;
    }
    return { adds, dels };
  }, [lines]);

  const capped = maxLines > 0 && lines.length > maxLines ? lines.slice(0, maxLines) : lines;
  const truncated = capped.length < lines.length;

  return (
    <div className={cn("tb-diff", className)}>
      {(filePath || stats.adds + stats.dels > 0) && (
        <div className="tb-diff-header">
          {filePath && <span className="tb-diff-filepath">{filePath}</span>}
          <span className="tb-diff-stats">
            <span className="tb-diff-stats-add">+{stats.adds}</span>
            <span className="tb-diff-stats-del">−{stats.dels}</span>
          </span>
        </div>
      )}
      <div className="tb-diff-body">
        {capped.map((l, i) => (
          <div
            key={i}
            className={cn(
              "tb-diff-row",
              l.kind === "add" && "tb-diff-row-add",
              l.kind === "del" && "tb-diff-row-del",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "tb-diff-rail",
                l.kind === "add" && "tb-diff-rail-add",
                l.kind === "del" && "tb-diff-rail-del",
                l.kind === "context" && "tb-diff-rail-context",
              )}
            />
            <span
              className={cn(
                "tb-diff-gutter",
                l.kind === "add" && "tb-diff-gutter-add",
                l.kind === "del" && "tb-diff-gutter-del",
                l.kind === "context" && "tb-diff-gutter-context",
              )}
            >
              {l.oldNum ?? ""}
            </span>
            <span
              className={cn(
                "tb-diff-gutter",
                l.kind === "add" && "tb-diff-gutter-add",
                l.kind === "del" && "tb-diff-gutter-del",
                l.kind === "context" && "tb-diff-gutter-context",
              )}
            >
              {l.newNum ?? ""}
            </span>
            <span
              className={cn(
                "tb-diff-sign",
                l.kind === "add" && "tb-diff-sign-add",
                l.kind === "del" && "tb-diff-sign-del",
                l.kind === "context" && "tb-diff-sign-context",
              )}
            >
              {l.kind === "add" ? "+" : l.kind === "del" ? "−" : " "}
            </span>
            <span className="tb-diff-text">{l.text}</span>
          </div>
        ))}
        {truncated && (
          <div className="tb-diff-truncated">
            … {lines.length - capped.length} more lines hidden
          </div>
        )}
      </div>
    </div>
  );
}
