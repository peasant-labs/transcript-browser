import { cn } from "../internal/cn.js";

/**
 * Human-readable duration with tabular figures. Returns the empty string for
 * null/undefined so callers can render nothing without conditionals.
 */
export function formatDuration(ms?: number): string {
  if (ms == null || !isFinite(ms) || ms < 0) return "";
  if (ms === 0) return "0ms";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s < 10 ? s.toFixed(1) : Math.round(s)}s`;
  const m = s / 60;
  if (m < 60) {
    const wholeM = Math.floor(m);
    const remS = Math.round(s - wholeM * 60);
    return remS > 0 ? `${wholeM}m ${remS}s` : `${wholeM}m`;
  }
  const h = Math.floor(m / 60);
  const remM = Math.floor(m - h * 60);
  return remM > 0 ? `${h}h ${remM}m` : `${h}h`;
}

export interface DurationBadgeProps {
  ms?: number;
  className?: string;
  prefix?: string;
}

export function DurationBadge({ ms, className, prefix }: DurationBadgeProps) {
  const text = formatDuration(ms);
  if (!text) return null;
  return (
    <span className={cn("tb-badge", className)}>
      {prefix ? `${prefix} ` : ""}
      {text}
    </span>
  );
}
