import { cn } from "../internal/cn.js";

export interface ProgressIndicatorProps {
  current: number;
  total: number;
  className?: string;
}

/**
 * Floating "X of Y" position indicator pinned bottom-right. Hides when total is
 * 0. Ported from peasant's `overlays/ProgressIndicator.tsx`.
 */
export function ProgressIndicator({ current, total, className }: ProgressIndicatorProps) {
  if (total <= 0) return null;
  return (
    <span className={cn("tb-root tb-progress tb-mono tb-tnum", className)} aria-live="polite">
      {Math.max(0, current).toLocaleString()} of {total.toLocaleString()}
    </span>
  );
}
