import { AlertCircle } from "lucide-react";
import { cn } from "../internal/cn.js";
import { Tooltip } from "../internal/Tooltip.js";

export interface ErrorPillProps {
  label?: string;
  /** Optional numeric payload — rendered inside the pill, mono tabular. */
  count?: number | string;
  className?: string;
  /** Hover explanation. Defaults to a generic tool-error message. */
  tooltip?: string;
}

/**
 * Compact inline error marker. A hover tooltip explaining the marker is baked
 * in, so every call site inherits it with no change.
 */
export function ErrorPill({
  label = "Error",
  count,
  className,
  tooltip = "A tool call returned an error.",
}: ErrorPillProps) {
  return (
    <Tooltip content={tooltip}>
      <span className={cn("tb-errorpill", className)}>
        <AlertCircle size={12} strokeWidth={1.75} className="tb-shrink-0" aria-hidden />
        <span className="tb-eyebrow">{label}</span>
        {count != null && count !== "" && (
          <span className="tb-errorpill-count">{count}</span>
        )}
      </span>
    </Tooltip>
  );
}
