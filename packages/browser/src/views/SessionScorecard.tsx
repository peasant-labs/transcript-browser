import { useMemo } from "react";
import { Coins, FileText, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "../internal/cn.js";
import type { SessionScorecard as SessionScorecardData } from "@peasant-labs/types";
import {
  assessSession,
  type AxisVerdict,
  type AxisId,
  type Band,
  type PersonalMedians,
} from "../lib/scorecard.js";

export interface SessionScorecardProps {
  /** Per-session quality signals; the card renders NOTHING when absent. */
  scorecard?: SessionScorecardData;
  /**
   * Personal medians computed by the host from the user's other sessions
   * (e.g. via `computePersonalMedians`). Omit to hide the comparison line —
   * graceful degradation; the viewer never fabricates a baseline.
   */
  medians?: PersonalMedians;
  className?: string;
}

const BAND_STYLE: Record<Band, { cls: string; label: string }> = {
  healthy: { cls: "tb-band-healthy", label: "On track" },
  caution: { cls: "tb-band-caution", label: "Watch" },
  risk: { cls: "tb-band-risk", label: "Off track" },
};

const AXIS_ICON: Record<AxisId, typeof Coins> = {
  token: Coins,
  prompt: FileText,
  loop: RefreshCw,
};

/**
 * SessionScorecard — the OPTIONAL deterministic "How this session went"
 * self-assessment card. Three axis cards (token / prompt / loop), each with a
 * headline value, a healthy/caution/risk band, and an optional "vs your median"
 * comparison line. No composite score. Pure presentational: all data via props,
 * never fetches. Renders nothing without a scorecard, so the viewer works fine
 * when the host omits it entirely.
 */
export function SessionScorecard({ scorecard, medians, className }: SessionScorecardProps) {
  const verdicts = useMemo(() => assessSession(scorecard, medians), [scorecard, medians]);

  if (!verdicts) return null;

  return (
    <section aria-label="Session self-assessment" className={cn("tb-scorecard", className)}>
      <header className="tb-scorecard-head">
        <span className="tb-scorecard-title">How this session went</span>
        <span className="tb-eyebrow">Self-assessment</span>
      </header>
      <div className="tb-scorecard-grid">
        {verdicts.map((v) => (
          <AxisCard key={v.id} verdict={v} />
        ))}
      </div>
    </section>
  );
}

function AxisCard({ verdict }: { verdict: AxisVerdict }) {
  const style = BAND_STYLE[verdict.band];
  const Icon = AXIS_ICON[verdict.id];
  const { comparison } = verdict;

  const better = comparison ? (comparison.delta >= 0) === comparison.higherIsBetter : false;

  return (
    <div className="tb-scorecard-axis">
      <div className="tb-scorecard-axis-head">
        <Icon size={13} strokeWidth={1.75} className="tb-toolicon-muted tb-shrink-0" />
        <span className="tb-eyebrow">{verdict.title}</span>
      </div>

      <div className="tb-scorecard-headline-row">
        <span className={cn("tb-scorecard-headline", !verdict.hasData && "tb-scorecard-headline-empty")}>
          {verdict.headline}
        </span>
        {verdict.hasData && (
          <span className={cn("tb-scorecard-band", style.cls)}>
            <span className="tb-scorecard-dot" aria-hidden />
            {style.label}
          </span>
        )}
      </div>

      {verdict.flags.length > 0 ? (
        <ul className="tb-scorecard-flags">
          {verdict.flags.map((f, i) => (
            <li key={i} className={cn("tb-scorecard-flag", f.band === "risk" ? "tb-ink-danger" : "tb-ink-caution")}>
              {f.label}
            </li>
          ))}
        </ul>
      ) : verdict.hasData ? (
        <p className="tb-scorecard-note">No issues flagged.</p>
      ) : (
        <p className="tb-scorecard-note tb-scorecard-note-empty">Not enough data yet.</p>
      )}

      {comparison && (
        <p className="tb-scorecard-comparison">
          {better ? (
            <TrendingUp size={11} strokeWidth={1.75} className="tb-ink-positive tb-shrink-0" />
          ) : (
            <TrendingDown size={11} strokeWidth={1.75} className="tb-toolicon-muted tb-shrink-0" />
          )}
          {comparison.text}
        </p>
      )}
    </div>
  );
}
