import { useMemo } from "react";
import { Chip, Tooltip } from "@peasant-labs/fairtrade/ui";
import { preview } from "../canvas/tool-renderers/types.js";
import { ANNOTATION_TYPE_LABELS } from "../lib/labels.js";
import type { TurnDetail } from "@peasant-labs/schema";
import type { TranscriptAnnotation } from "../lib/pattern-detection.js";

export interface AnnotationsViewProps {
  /**
   * Annotations to render. The host supplies these — typically the result of
   * the exported `annotateTranscript(turns)` helper, but the host may pass any
   * annotations it has (backend-sourced, etc.). The viewer never derives them.
   */
  annotations: TranscriptAnnotation[];
  turns: TurnDetail[];
  onJumpToTurn?: (turnIndex: number) => void;
}

type AnnotationType = TranscriptAnnotation["type"];
/** fairtrade Chip semantic tones (`.chip-ok` / `.chip-warn` / `.chip-err`). */
type ChipTone = "ok" | "warn" | "err";

const TYPE_LABEL = ANNOTATION_TYPE_LABELS;

/**
 * Semantic annotation types compose a fairtrade `<Chip tone>` (no browser tone
 * duplicate). `subagent` carries no semantic tone — it renders a neutral
 * fairtrade `<Chip>` (no tone).
 */
const TYPE_TONE: Partial<Record<AnnotationType, ChipTone>> = {
  error: "err",
  retry: "warn",
  revert: "warn",
};

const TYPE_EXPLANATION: Record<AnnotationType, string> = {
  error:
    "A tool call or command failed — a non-zero exit or thrown exception. Frequent errors point to friction the agent had to work around.",
  retry:
    "The agent repeated a similar action after it did not work the first time. Retry loops often signal a confusing or under-specified task.",
  revert:
    "An earlier edit was undone or rewritten. Reverts mean the agent changed its mind, which can hint at a wrong first approach.",
  subagent:
    "The agent delegated work to a subagent. Subagent calls show where the task was decomposed into a separate, focused run.",
};

/**
 * Tabular view of all annotations on the session, grouped by turn. Each row
 * links back to the annotated turn. Ported from peasant's
 * `views/AnnotationsView.tsx`. Annotations arrive via props (host-derived).
 */
export function AnnotationsView({ annotations, turns, onJumpToTurn }: AnnotationsViewProps) {
  const grouped = useMemo(() => {
    const byTurn = new Map<number, TranscriptAnnotation[]>();
    for (const a of annotations) {
      const arr = byTurn.get(a.turnIndex) ?? [];
      arr.push(a);
      byTurn.set(a.turnIndex, arr);
    }
    return Array.from(byTurn.entries()).sort((a, b) => a[0] - b[0]);
  }, [annotations]);

  return (
    <div className="tb-view-stack tb-annview">
      <p className="tb-annview-intro">
        Automatically detected moments in this session — errors, retries, reverted edits, and subagent
        calls. They surface where the agent ran into friction or changed course.
      </p>

      {annotations.length === 0 ? (
        <div className="tb-view-empty">No annotations detected in this session.</div>
      ) : (
        <div className="tb-annview-list">
          {grouped.map(([turnIndex, anns]) => {
            const turn = turns.find((t) => t.index === turnIndex);
            if (!turn) return null;
            return (
              <button
                type="button"
                key={turnIndex}
                data-anchor-turn={turnIndex}
                onClick={() => onJumpToTurn?.(turnIndex)}
                className="tb-annview-row"
              >
                <header className="tb-annview-row-head">
                  <span className="tb-mono tb-tnum tb-annview-turn">
                    turn {turnIndex + 1} · {turn.role}
                  </span>
                  <span className="tb-annview-chips">
                    {anns.map((a, i) => (
                      <Tooltip key={i} id={`tb-annview-${a.type}-${turnIndex}-${i}`} content={TYPE_EXPLANATION[a.type]}>
                        {TYPE_TONE[a.type] ? (
                          <Chip tone={TYPE_TONE[a.type]} className="tb-chip-help">
                            {TYPE_LABEL[a.type] ?? a.type}
                          </Chip>
                        ) : (
                          <Chip className="tb-chip-help">
                            {TYPE_LABEL[a.type] ?? a.type}
                          </Chip>
                        )}
                      </Tooltip>
                    ))}
                  </span>
                </header>
                {turn.content?.trim() && <p className="tb-annview-preview">{preview(turn.content, 240)}</p>}
                {anns.map((a, i) =>
                  a.label ? (
                    <p key={`l-${i}`} className="tb-annview-label">
                      {a.label}
                    </p>
                  ) : null,
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
