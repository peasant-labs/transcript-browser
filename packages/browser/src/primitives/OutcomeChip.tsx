import { useMemo } from "react";
import { Chip, Tooltip } from "@peasant-labs/fairtrade/ui";
import { ShieldCheck, CircleDot, AlertTriangle } from "@peasant-labs/fairtrade/icons";
import { cn } from "../internal/cn.js";

/**
 * OutcomeChip — semantic-coloured outcome badge with a hover tooltip. Surfaces
 * an assigned session outcome and explains, on hover, what it means and (when
 * present) which signals drove it.
 *
 * DOMAIN component: the value here is mapping the several backend outcome string
 * shapes (`resolved`/`partial`/`failed`, `resolved`/`not_resolved`,
 * `positive`/`negative`) onto one normalised visual + explanation. The chip
 * chrome itself is NOT re-implemented — it composes fairtrade `<Chip tone>`
 * (ok/warn/err), so the semantic tone colours come from the design system, not
 * a TB duplicate.
 */

type OutcomeTone = "positive" | "partial" | "negative";
/** fairtrade Chip semantic tones (`.chip-ok` / `.chip-warn` / `.chip-err`). */
type ChipTone = "ok" | "warn" | "err";

interface OutcomeVisual {
  tone: OutcomeTone;
  label: string;
  chipTone: ChipTone;
  icon: typeof ShieldCheck;
  explanation: string;
}

/**
 * Map any of the outcome/label string shapes the backend emits into a single
 * normalised visual. Accepts SessionOutcome (`resolved`/`partial`/`failed`),
 * annotation outcome values (`resolved`/`not_resolved`), and the binary label
 * (`positive`/`negative`).
 */
function resolveOutcome(raw: string | undefined): OutcomeVisual | undefined {
  if (!raw) return undefined;
  switch (raw) {
    case "resolved":
    case "positive":
      return {
        tone: "positive",
        label: "resolved",
        chipTone: "ok",
        icon: ShieldCheck,
        explanation: "Resolved — the session reached a successful end state.",
      };
    case "partial":
      return {
        tone: "partial",
        label: "partial",
        chipTone: "warn",
        icon: CircleDot,
        explanation: "Partial — made progress but didn't fully resolve.",
      };
    case "failed":
    case "not_resolved":
    case "negative":
      return {
        tone: "negative",
        label: "not resolved",
        chipTone: "err",
        icon: AlertTriangle,
        explanation: "Failed — ended without resolving.",
      };
    default:
      return undefined;
  }
}

export interface OutcomeChipProps {
  /**
   * Outcome / label string. Accepts SessionOutcome, annotation outcome values,
   * or the binary label — see `resolveOutcome`.
   */
  outcome: string | undefined;
  /** Contributing signals that drove the outcome — appended to the tooltip. */
  reasons?: string[];
  className?: string;
}

/**
 * Render a session outcome as a semantically-coloured chip. Hovering surfaces a
 * compact tooltip explaining the outcome (and any contributing signals).
 * Renders nothing for an unknown / absent outcome.
 */
export function OutcomeChip({ outcome, reasons, className }: OutcomeChipProps) {
  const visual = useMemo(() => resolveOutcome(outcome), [outcome]);
  if (!visual) return null;

  const cleanReasons = (reasons ?? []).map((r) => r.trim()).filter(Boolean);
  const explanation =
    cleanReasons.length > 0
      ? `${visual.explanation} ${cleanReasons.join("; ")}`
      : visual.explanation;

  return (
    <Tooltip id={`tb-outcome-${visual.tone}-tooltip`} content={explanation}>
      <Chip
        tone={visual.chipTone}
        icon={visual.icon}
        chrome
        className={cn("tb-chip-help", className)}
      >
        {visual.label}
      </Chip>
    </Tooltip>
  );
}

/**
 * Collect the available "why" reason strings for a session from whatever
 * reason-bearing fields the current data shapes carry. Returns a de-duplicated
 * list of non-empty reason strings.
 */
export function collectOutcomeReasons(opts: {
  agentLabelReason?: string;
  annotationReasons?: (string | undefined)[];
}): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (r: string | undefined) => {
    const t = r?.trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    out.push(t);
  };
  push(opts.agentLabelReason);
  for (const r of opts.annotationReasons ?? []) push(r);
  return out;
}
