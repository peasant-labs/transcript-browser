import * as React from "react";
import { cn } from "../internal/cn.js";

/**
 * shadcn-style skeleton placeholder, ported from the village viewer redesign.
 * The redesign used `bg-surface-hover animate-shimmer` (a Tailwind keyframe). The
 * shimmer keyframes are defined locally in `styles.css` (`.tb-ui-skeleton`) so
 * the package carries no Tailwind animation config.
 */
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("tb-ui-skeleton", className)}
      {...props}
    />
  );
}
