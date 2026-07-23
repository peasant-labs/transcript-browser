import { useMemo } from "react";
import { Tooltip } from "@peasant-labs/fairtrade/ui";
import { AlertTriangle, RefreshCw, RotateCcw, CornerDownRight } from "@peasant-labs/fairtrade/icons";
import { cn } from "../internal/cn.js";
import { preview } from "../canvas/tool-renderers/types.js";
import { ANNOTATION_TYPE_LABELS } from "../lib/labels.js";
import type { TurnDetail } from "@peasant-labs/schema";
import type { TranscriptAnnotation } from "../lib/pattern-detection.js";

export interface AnnotationsOutlineProps {
  annotations: TranscriptAnnotation[];
  turns: TurnDetail[];
  activeTurnIndex?: number;
  onJumpToTurn?: (turnIndex: number) => void;
  className?: string;
}

type AnnotationType = TranscriptAnnotation["type"];

const TYPE_LABEL = ANNOTATION_TYPE_LABELS;

const TYPE_ORDER: AnnotationType[] = ["error", "retry", "revert", "subagent"];

const TYPE_EXPLANATION: Record<AnnotationType, string> = {
  error: "A tool call or command failed — frequent errors point to friction the agent worked around.",
  retry: "The agent repeated a similar action after it did not work — often a sign of an under-specified task.",
  revert: "An earlier edit was undone or rewritten — the agent changed its mind on an approach.",
  subagent: "The agent delegated work to a subagent — a separate, focused run.",
};

/**
 * Outline for the Annotations tab — groups by type, each row jumps to its turn.
 * Ported from peasant's `rails/AnnotationsOutline.tsx`. Radix tooltip replaced
 * with the dependency-free CSS Tooltip.
 */
export function AnnotationsOutline({
  annotations,
  turns,
  activeTurnIndex,
  onJumpToTurn,
  className,
}: AnnotationsOutlineProps) {
  const grouped = useMemo(() => {
    const byType = new Map<AnnotationType, TranscriptAnnotation[]>();
    for (const a of annotations) {
      const arr = byType.get(a.type) ?? [];
      arr.push(a);
      byType.set(a.type, arr);
    }
    for (const arr of byType.values()) arr.sort((a, b) => a.turnIndex - b.turnIndex);
    return byType;
  }, [annotations]);

  if (annotations.length === 0) {
    return <div className={cn("tb-outline-empty", className)}>No annotations detected in this session.</div>;
  }

  return (
    <nav className={cn("tb-outline", className)} aria-label="Annotations outline">
      {TYPE_ORDER.map((type) => {
        const list = grouped.get(type);
        if (!list || list.length === 0) return null;
        return (
          <section key={type} data-anntype={type} className="tb-annoutline-group">
            <header className="tb-annoutline-head">
              <Tooltip id={`tb-annoutline-${type}-tooltip`} content={TYPE_EXPLANATION[type]}>
                <span className="tb-eyebrow tb-annoutline-type tb-chip-help">
                  <span className="tb-ink-muted">
                    <TypeIcon type={type} />
                  </span>
                  {TYPE_LABEL[type]}
                </span>
              </Tooltip>
              <span className="tb-mono tb-tnum tb-annoutline-count">{list.length}</span>
            </header>
            <div className="tb-annoutline-rows">
              {list.map((a, i) => {
                const turn = turns.find((t) => t.index === a.turnIndex);
                const active = activeTurnIndex === a.turnIndex;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onJumpToTurn?.(a.turnIndex)}
                    className={cn("tb-annoutline-row", active && "tb-outline-row-active")}
                  >
                    <span className="tb-annoutline-rowhead">
                      <span className="tb-mono tb-tnum tb-annoutline-turn">turn {a.turnIndex + 1}</span>
                      {turn?.role && <span className="tb-mono tb-annoutline-role">{turn.role}</span>}
                    </span>
                    <span className="tb-annoutline-text">{a.label || preview(turn?.content ?? "", 80)}</span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </nav>
  );
}

function TypeIcon({ type }: { type: AnnotationType }) {
  switch (type) {
    case "error":
      return <AlertTriangle size={11} strokeWidth={1.75} />;
    case "retry":
      return <RefreshCw size={11} strokeWidth={1.75} />;
    case "revert":
      return <RotateCcw size={11} strokeWidth={1.75} />;
    case "subagent":
      return <CornerDownRight size={11} strokeWidth={1.75} />;
  }
}
