import type { ReactNode } from "react";
import { Check } from "@peasant-labs/fairtrade/icons";
import { cn } from "../internal/cn.js";

export interface FilterCheckboxProps {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  label: string;
  count?: number;
  /** Optional icon to the left of the label. */
  icon?: ReactNode;
  /** When true, render a sub-filter row (indented). */
  indent?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Monochrome filter checkbox row. Ported from peasant's `rails/FilterCheckbox.tsx`.
 */
export function FilterCheckbox({
  checked,
  onCheckedChange,
  label,
  count,
  icon,
  indent,
  disabled,
  className,
}: FilterCheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "tb-fcheck",
        indent ? "tb-fcheck-indent" : "tb-fcheck-flush",
        disabled && "tb-fcheck-disabled",
        className,
      )}
    >
      <span aria-hidden className={cn("tb-fcheck-box", checked && "tb-fcheck-box-on")}>
        <Check size={9} strokeWidth={3} />
      </span>
      {icon && <span className="tb-fcheck-icon">{icon}</span>}
      <span className={cn("tb-fcheck-label tb-truncate", checked && "tb-fcheck-label-on")}>{label}</span>
      {count != null && <span className={cn("tb-fcheck-count", checked && "tb-fcheck-count-on")}>{count.toLocaleString()}</span>}
    </button>
  );
}
