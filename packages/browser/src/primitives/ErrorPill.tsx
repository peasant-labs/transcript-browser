import { AlertCircle } from "@peasant-labs/fairtrade/icons";
import { Chip, Tooltip } from "@peasant-labs/fairtrade/ui";
import { cn } from "../internal/cn.js";

export interface ErrorPillProps {
  label?: string;
  /** Optional numeric payload — rendered inside the pill, mono tabular. */
  count?: number | string;
  className?: string;
  /** Hover explanation. Defaults to a generic tool-error message. */
  tooltip?: string;
}

/**
 * Compact inline error marker. A DOMAIN wrapper around the design system's
 * semantic chip: it composes <Chip tone="err"> (the canonical clay error tone +
 * mono chrome) with the AlertCircle glyph and bakes in a hover tooltip, so every
 * call site inherits the explanation with no change. The error tone is no longer
 * a bespoke TB pill — it reads from the design system.
 */
export function ErrorPill({
  label = "error",
  count,
  className,
  tooltip = "a tool call returned an error.",
}: ErrorPillProps) {
  const hasCount = count != null && count !== "";
  return (
    <Tooltip id={`tb-errorpill-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} content={tooltip}>
      <Chip tone="err" icon={AlertCircle} chrome className={cn("tb-chip-help", className)}>
        {label}
        {hasCount ? ` ${count}` : ""}
      </Chip>
    </Tooltip>
  );
}
