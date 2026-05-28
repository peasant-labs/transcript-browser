import type { ReactNode } from "react";
import { cn } from "../internal/cn.js";
import { Tooltip } from "../internal/Tooltip.js";

/**
 * Generic metadata chip — used in the session hero strip and elsewhere.
 * Single visual treatment; the variant only swaps emphasis / semantic colour.
 */
export type ChipVariant =
  | "default"
  | "subtle"
  | "outline"
  | "success"
  | "danger"
  | "warning";

export interface ChipProps {
  children: ReactNode;
  icon?: ReactNode;
  variant?: ChipVariant;
  className?: string;
  /** Native title — kept for back-compat. Prefer `tooltip`. */
  title?: string;
  /**
   * Short explanatory text shown in a hover tooltip. When set, the chip
   * becomes hover-explainable (`cursor: help`).
   */
  tooltip?: ReactNode;
}

const VARIANT_CLS: Record<ChipVariant, string> = {
  default: "tb-chip-default",
  subtle: "tb-chip-subtle",
  outline: "tb-chip-outline",
  success: "tb-chip-success",
  danger: "tb-chip-danger",
  warning: "tb-chip-warning",
};

export function Chip({
  children,
  icon,
  variant = "default",
  className,
  title,
  tooltip,
}: ChipProps) {
  const chip = (
    <span
      title={title}
      className={cn(
        "tb-chip",
        VARIANT_CLS[variant],
        tooltip != null && "tb-chip-help",
        className,
      )}
    >
      {icon && <span className="tb-shrink-0">{icon}</span>}
      {children}
    </span>
  );

  if (tooltip == null) return chip;
  return <Tooltip content={tooltip}>{chip}</Tooltip>;
}
