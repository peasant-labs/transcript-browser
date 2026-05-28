import { useMemo } from "react";
import { CheckCircle2, CircleDot, XCircle } from "lucide-react";
import { Chip, type ChipVariant } from "./Chip.js";

/**
 * OutcomeChip — semantic-coloured outcome badge with a hover tooltip. Surfaces
 * an assigned session outcome and explains, on hover, what it means and (when
 * present) which signals drove it.
 */

type OutcomeTone = "positive" | "partial" | "negative";

interface OutcomeVisual {
  tone: OutcomeTone;
  label: string;
  variant: ChipVariant;
  icon: typeof CheckCircle2;
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
        label: "Resolved",
        variant: "success",
        icon: CheckCircle2,
        explanation: "Resolved — the session reached a successful end state.",
      };
    case "partial":
      return {
        tone: "partial",
        label: "Partial",
        variant: "warning",
        icon: CircleDot,
        explanation: "Partial — made progress but didn't fully resolve.",
      };
    case "failed":
    case "not_resolved":
    case "negative":
      return {
        tone: "negative",
        label: "Not resolved",
        variant: "danger",
        icon: XCircle,
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

  const Icon = visual.icon;
  const cleanReasons = (reasons ?? []).map((r) => r.trim()).filter(Boolean);
  const explanation =
    cleanReasons.length > 0
      ? `${visual.explanation} ${cleanReasons.join("; ")}`
      : visual.explanation;

  return (
    <Chip
      variant={visual.variant}
      icon={<Icon size={11} strokeWidth={1.75} />}
      tooltip={explanation}
      className={className}
    >
      {visual.label}
    </Chip>
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
