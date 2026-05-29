import { useMemo } from "react";
import { AlertTriangle, GitCommit, Sparkles, Flag, Play } from "lucide-react";
import { cn } from "../internal/cn.js";
import { preview } from "../canvas/tool-renderers/types.js";
import { phaseLabel } from "../lib/phase.js";
import type { TurnDetail, SessionCommit, Phase } from "@peasant-labs/types";

export interface HighlightsOutlineProps {
  turns: TurnDetail[];
  phases: Phase[];
  errorTurnIndices?: number[];
  commits?: SessionCommit[];
  activeTurnIndex?: number;
  onJumpToTurn?: (turnIndex: number) => void;
  className?: string;
}

type Row =
  | { kind: "first"; turnIndex: number; label: string; sub: string }
  | { kind: "phase"; turnIndex: number; label: string; sub: string }
  | { kind: "error"; turnIndex: number; label: string; sub: string }
  | { kind: "checkpoint"; turnIndex?: number; label: string; sub: string }
  | { kind: "final"; turnIndex: number; label: string; sub: string };

/**
 * Outline view for the Highlights tab. Lists the same moments the Highlights
 * view surfaces. Ported from peasant's `rails/HighlightsOutline.tsx`.
 */
export function HighlightsOutline({
  turns,
  phases,
  errorTurnIndices = [],
  commits = [],
  activeTurnIndex,
  onJumpToTurn,
  className,
}: HighlightsOutlineProps) {
  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    const firstUser = turns.find((t) => t.role === "user" && t.content?.trim());
    if (firstUser) {
      out.push({ kind: "first", turnIndex: firstUser.index, label: "Initial request", sub: preview(firstUser.content, 90) });
    }
    phases.slice(1).forEach((p) => {
      const t = turns[p.startTurn];
      if (!t) return;
      out.push({ kind: "phase", turnIndex: t.index, label: phaseLabel(p.type) + " begins", sub: `turn ${p.startTurn + 1}` });
    });
    const errSet = new Set(errorTurnIndices);
    let errCount = 0;
    for (const t of turns) {
      if (errCount >= 3) break;
      const hasErr = errSet.has(t.index) || t.toolCalls?.some((c) => c.isError);
      if (!hasErr) continue;
      const errCall = t.toolCalls?.find((c) => c.isError);
      out.push({
        kind: "error",
        turnIndex: t.index,
        label: errCall ? `${errCall.name} failed` : "Error",
        sub: preview(errCall?.result || t.content || "", 80),
      });
      errCount++;
    }
    for (const c of commits) {
      const ct = new Date(c.timestamp).getTime();
      const target = isFinite(ct) ? turns.find((t) => new Date(t.timestamp).getTime() >= ct) : undefined;
      out.push({ kind: "checkpoint", turnIndex: target?.index, label: `Checkpoint ${c.hash.slice(0, 7)}`, sub: preview(c.message, 80) });
    }
    const lastAssistant = [...turns].reverse().find((t) => t.role === "assistant" && (t.depth ?? 0) === 0 && t.content?.trim());
    if (lastAssistant) {
      out.push({ kind: "final", turnIndex: lastAssistant.index, label: "Final response", sub: preview(lastAssistant.content, 90) });
    }
    return out;
  }, [turns, phases, errorTurnIndices, commits]);

  if (rows.length === 0) {
    return <div className={cn("tb-outline-empty", className)}>No highlights yet.</div>;
  }

  return (
    <nav className={cn("tb-outline", className)} aria-label="Highlight outline">
      {rows.map((r, i) => {
        const active = r.turnIndex != null && activeTurnIndex === r.turnIndex;
        const disabled = r.turnIndex == null;
        return (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => r.turnIndex != null && onJumpToTurn?.(r.turnIndex)}
            className={cn("tb-outline-srow tb-focus", disabled && "tb-outline-srow-disabled", active && "tb-outline-row-active")}
          >
            <span className="tb-outline-srow-icon">
              <RowIcon kind={r.kind} />
            </span>
            <span className="tb-outline-srow-body">
              <span className="tb-outline-srow-label tb-truncate">{r.label}</span>
              <span className="tb-outline-srow-sub">{r.sub}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function RowIcon({ kind }: { kind: Row["kind"] }) {
  switch (kind) {
    case "first":
      return <Play size={12} strokeWidth={1.75} />;
    case "phase":
      return <Flag size={12} strokeWidth={1.75} />;
    case "error":
      return <AlertTriangle size={12} strokeWidth={1.75} />;
    case "checkpoint":
      return <GitCommit size={12} strokeWidth={1.75} />;
    case "final":
      return <Sparkles size={12} strokeWidth={1.75} />;
  }
}
