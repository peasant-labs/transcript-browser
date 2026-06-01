import { useMemo, type ReactNode } from "react";
import { cn } from "../internal/cn.js";
import { Markdown } from "../primitives/Markdown.js";
import { RoleGlyph } from "../primitives/RoleGlyph.js";
import { TokenBadge } from "../primitives/TokenBadge.js";
import { ErrorPill } from "../primitives/ErrorPill.js";
import { ProviderIcon } from "../primitives/ProviderIcon.js";
import { SessionScorecard } from "./SessionScorecard.js";
import { preview } from "../canvas/tool-renderers/types.js";
import { formatRelative } from "../lib/time.js";
import { phaseLabel } from "../lib/phase.js";
import type { PersonalMedians } from "../lib/scorecard.js";
import type {
  TurnDetail,
  SessionDetailPayload,
  Provider,
  Phase,
  SessionScorecard as SessionScorecardData,
} from "@peasant-labs/types";

export interface HighlightsViewProps {
  detail: SessionDetailPayload;
  turns: TurnDetail[];
  phases: Phase[];
  errorTurnIndices?: number[];
  onJumpToTurn?: (turnIndex: number) => void;
  /**
   * OPTIONAL scorecard data for the self-assessment card. Defaults to
   * `detail.scorecard`. Pass `null` to suppress the card entirely.
   */
  scorecard?: SessionScorecardData | null;
  /**
   * OPTIONAL personal medians for the scorecard comparison line. The host
   * computes these (e.g. via `computePersonalMedians`) from the user's other
   * sessions — the viewer never fetches them.
   */
  medians?: PersonalMedians;
}

interface Highlight {
  kind: "first-prompt" | "phase" | "checkpoint" | "error" | "final" | "milestone";
  turnIndex?: number;
  title: string;
  body?: string;
  meta?: ReactNode;
  tag?: string;
}

/**
 * Curated "Highlights" view — surfaces the few moments that matter from a long
 * transcript: first prompt, last response, checkpoints, errors, phase
 * transitions. Each highlight links back into the full trace. Ported from
 * peasant's `views/HighlightsView.tsx`, with the personal-median fetch lifted
 * out to props (the viewer takes data in, never fetches).
 */
export function HighlightsView({
  detail,
  turns,
  phases,
  errorTurnIndices = [],
  onJumpToTurn,
  scorecard,
  medians,
}: HighlightsViewProps) {
  const provider = detail.harness as Provider;
  const errorSet = useMemo(() => new Set(errorTurnIndices), [errorTurnIndices]);

  const highlights: Highlight[] = useMemo(() => {
    const out: Highlight[] = [];

    const firstUser = turns.find((t) => t.role === "user" && t.content?.trim());
    if (firstUser) {
      out.push({
        kind: "first-prompt",
        turnIndex: firstUser.index,
        title: "Initial request",
        body: firstUser.content,
        meta: <span>{formatRelative(firstUser.timestamp)}</span>,
      });
    }

    phases.slice(1).forEach((p) => {
      const t = turns[p.startTurn];
      if (!t) return;
      out.push({
        kind: "phase",
        turnIndex: t.index,
        title: phaseLabel(p.type) + " begins",
        body: preview(t.content || t.toolCalls?.[0]?.arguments || "", 220),
        meta: <span>turn {p.startTurn + 1}</span>,
        tag: phaseLabel(p.type),
      });
    });

    let errCount = 0;
    for (const t of turns) {
      if (errCount >= 3) break;
      const hasErr = errorSet.has(t.index) || t.toolCalls?.some((c) => c.isError);
      if (!hasErr) continue;
      const errCall = t.toolCalls?.find((c) => c.isError);
      out.push({
        kind: "error",
        turnIndex: t.index,
        title: errCall ? `${errCall.name} failed` : "Error",
        body: preview(errCall?.result || t.content, 220),
        meta: <ErrorPill />,
      });
      errCount++;
    }

    (detail.gitContext?.commits ?? []).forEach((c) => {
      out.push({
        kind: "checkpoint",
        title: `Checkpoint: ${c.hash.slice(0, 7)}`,
        body: c.message,
        meta: (
          <span className="tb-mono tb-tnum">
            <span className="tb-ink-positive">+{c.insertions ?? 0}</span>
            <span className="tb-hl-sep">/</span>
            <span className="tb-ink-danger">−{c.deletions ?? 0}</span>
            {c.filesChanged ? <span className="tb-ink-muted"> · {c.filesChanged} files</span> : null}
          </span>
        ),
      });
    });

    const lastAssistant = [...turns]
      .reverse()
      .find((t) => t.role === "assistant" && (t.depth ?? 0) === 0 && t.content?.trim());
    if (lastAssistant) {
      out.push({
        kind: "final",
        turnIndex: lastAssistant.index,
        title: "Final response",
        body: lastAssistant.content,
        meta: (
          <TokenBadge
            tokens={(lastAssistant.tokensIn ?? 0) + (lastAssistant.tokensOut ?? 0) || undefined}
            tokensIn={lastAssistant.tokensIn}
            tokensOut={lastAssistant.tokensOut}
          />
        ),
      });
    }

    return out;
  }, [turns, phases, errorSet, detail.gitContext?.commits]);

  const effectiveScorecard = scorecard === null ? undefined : (scorecard ?? detail.scorecard);
  const card =
    scorecard === null ? null : <SessionScorecard scorecard={effectiveScorecard} medians={medians} />;

  if (highlights.length === 0) {
    return (
      <div className="tb-view-stack">
        {card}
        <div className="tb-view-empty">No highlights yet.</div>
      </div>
    );
  }

  return (
    <div className="tb-view-stack">
      {card}
      <ol className="tb-hl-list">
        {highlights.map((h, i) => (
          <li key={i}>
            <button
              type="button"
              data-anchor-turn={h.turnIndex}
              onClick={() => h.turnIndex != null && onJumpToTurn?.(h.turnIndex)}
              disabled={h.turnIndex == null}
              className={cn("tb-hl-card tb-focus", h.turnIndex == null && "tb-hl-card-static")}
            >
              <span className="tb-hl-icon">
                {h.kind === "first-prompt" && <RoleGlyph role="user" size={14} />}
                {h.kind === "final" && <ProviderIcon provider={provider} size={14} />}
                {h.kind === "phase" && <RoleGlyph role="system" size={10} />}
                {h.kind === "error" && <RoleGlyph role="system" size={10} />}
                {h.kind === "checkpoint" && <span className="tb-mono tb-hl-cmd">⌘</span>}
                {h.kind === "milestone" && <RoleGlyph role="assistant" size={12} />}
              </span>
              <div className="tb-hl-body">
                <header className="tb-hl-head">
                  <span className="tb-hl-title">{h.title}</span>
                </header>
                {h.body && (
                  <div className="tb-hl-prose">
                    <Markdown>{preview(h.body, 480)}</Markdown>
                  </div>
                )}
                {h.meta && <footer className="tb-hl-meta">{h.meta}</footer>}
              </div>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
