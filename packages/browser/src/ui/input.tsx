import * as React from "react";
import { cn } from "../internal/cn.js";

/**
 * shadcn-style text input, ported from the village viewer redesign. The
 * redesign's Tailwind/village classes (`border-rule`, `bg-surface`,
 * `placeholder:text-ink-4`, `focus-mono`, `aria-invalid:border-danger …`) become
 * `.tb-ui-input` (token-backed; the `aria-invalid` styling is a CSS selector in
 * `styles.css`). The `.tb-focus` ring matches the rest of the package.
 */
export function Input({
  className,
  type,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn("tb-ui-input tb-focus", className)}
      {...props}
    />
  );
}
