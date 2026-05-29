import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "../internal/cn.js";

/**
 * shadcn-style checkbox, ported from the village viewer redesign. The redesign
 * wrapped Radix `Checkbox.Root` + `Indicator`; to keep the package free of a
 * UI-kit dependency this is a dependency-free `role="checkbox"` button that
 * preserves the same controlled API (`checked` + `onCheckedChange`) and the
 * `data-state="checked|unchecked"` attribute the redesign styled against. The
 * visual treatment (`border-rule`, checked `bg-mark`/`text-mark-fg`,
 * `focus-mono`, disabled opacity) maps to `.tb-ui-checkbox` in `styles.css`.
 */
export interface CheckboxProps
  extends Omit<React.ComponentProps<"button">, "onChange" | "type"> {
  /** Controlled checked state. */
  checked?: boolean;
  /** Fired with the next checked state on toggle. */
  onCheckedChange?: (checked: boolean) => void;
}

export function Checkbox({
  className,
  checked = false,
  onCheckedChange,
  disabled,
  onClick,
  ...props
}: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      data-slot="checkbox"
      data-state={checked ? "checked" : "unchecked"}
      disabled={disabled}
      className={cn("tb-ui-checkbox tb-focus", className)}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) onCheckedChange?.(!checked);
      }}
      {...props}
    >
      {checked && (
        <span data-slot="checkbox-indicator" className="tb-ui-checkbox-indicator">
          <Check size={14} strokeWidth={2.5} />
        </span>
      )}
    </button>
  );
}
