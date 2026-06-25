import { useMemo } from "react";
import { diffLines } from "diff";
import { DiffView as FairtradeDiffView } from "@peasant-labs/fairtrade/ui";

export interface DiffViewProps {
  oldText: string;
  newText: string;
  filePath?: string;
  /** Maximum visible lines before truncating; 0 = no cap. */
  maxLines?: number;
  className?: string;
}

type HunkLine = {
  type: "add" | "del" | "ctx";
  oldNo?: number;
  newNo?: number;
  text: string;
};

/**
 * Unified inline diff. DOMAIN composition: transcript-browser keeps the line
 * computation (old/new text → numbered add/del/ctx lines via `diffLines`) and
 * feeds it into the design system's DiffView chassis, which paints the file
 * header + churn, the add/del rails, and the redundant +/− SIGN GUTTER (so
 * additions/deletions are never conveyed by colour alone).
 */
export function DiffView({
  oldText,
  newText,
  filePath,
  maxLines = 200,
  className,
}: DiffViewProps) {
  const lines = useMemo<HunkLine[]>(() => {
    const parts = diffLines(oldText ?? "", newText ?? "");
    const out: HunkLine[] = [];
    let oldNo = 1;
    let newNo = 1;
    for (const part of parts) {
      const partLines = part.value.split("\n");
      // diffLines includes a trailing empty string when the chunk ends with \n.
      if (partLines.length > 0 && partLines[partLines.length - 1] === "") partLines.pop();
      for (const text of partLines) {
        if (part.added) {
          out.push({ type: "add", newNo: newNo++, text });
        } else if (part.removed) {
          out.push({ type: "del", oldNo: oldNo++, text });
        } else {
          out.push({ type: "ctx", oldNo: oldNo++, newNo: newNo++, text });
        }
      }
    }
    return out;
  }, [oldText, newText]);

  const capped = maxLines > 0 && lines.length > maxLines ? lines.slice(0, maxLines) : lines;
  const hidden = lines.length - capped.length;
  const hunkLines: HunkLine[] =
    hidden > 0
      ? [...capped, { type: "ctx", text: `… ${hidden} more lines hidden` }]
      : capped;

  return (
    <FairtradeDiffView
      file={filePath ?? ""}
      hunks={[{ lines: hunkLines }]}
      className={className}
    />
  );
}
