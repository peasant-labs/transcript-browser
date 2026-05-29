import * as React from "react";
import { cn } from "../internal/cn.js";

/**
 * shadcn-style card, ported from the village viewer redesign. The redesign's
 * `bg-surface text-ink border border-rule py-6` / `px-6` Tailwind classes are
 * folded into `.tb-ui-card` / `.tb-ui-card-content` (token-backed) in
 * `styles.css`.
 */
export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="card" className={cn("tb-ui-card", className)} {...props} />
  );
}

export function CardContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("tb-ui-card-content", className)}
      {...props}
    />
  );
}
